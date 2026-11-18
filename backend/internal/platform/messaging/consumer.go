package messaging

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"
	"time"

	goredis "github.com/redis/go-redis/v9"

	"github.com/ryuga/ryugaware/backend/internal/platform/redis"
)

type Handler func(ctx context.Context, env Envelope) error

type ConsumerConfig struct {
	Stream         string
	DLQStream      string
	Group          string
	Name           string
	EventTypes     []string
	BatchSize      int64
	BlockTimeout   time.Duration
	MaxRetries     int64
	ClaimMinIdle   time.Duration
	ClaimInterval  time.Duration
	HandlerTimeout time.Duration
}

type Consumer struct {
	rdb     *redis.Client
	cfg     ConsumerConfig
	log     *slog.Logger
	handler Handler
	wanted  map[string]struct{}
}

func NewConsumer(rdb *redis.Client, cfg ConsumerConfig, log *slog.Logger, handler Handler) *Consumer {
	wanted := make(map[string]struct{}, len(cfg.EventTypes))
	for _, t := range cfg.EventTypes {
		wanted[t] = struct{}{}
	}
	return &Consumer{rdb: rdb, cfg: cfg, log: log.With(slog.String("consumer", cfg.Group)), handler: handler, wanted: wanted}
}

func (c *Consumer) Run(ctx context.Context) {
	if err := c.ensureGroup(ctx); err != nil {
		c.log.Error("consumer group not ready", slog.String("error", err.Error()))
		return
	}
	c.log.Info("consumer started", slog.String("stream", c.cfg.Stream))

	recover := time.NewTicker(c.cfg.ClaimInterval)
	defer recover.Stop()
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-recover.C:
				c.recoverPending(ctx)
			}
		}
	}()

	for {
		select {
		case <-ctx.Done():
			c.log.Info("consumer stopped")
			return
		default:
		}

		streams, err := c.rdb.Raw().XReadGroup(ctx, &goredis.XReadGroupArgs{
			Group:    c.cfg.Group,
			Consumer: c.cfg.Name,
			Streams:  []string{c.cfg.Stream, ">"},
			Count:    c.cfg.BatchSize,
			Block:    c.cfg.BlockTimeout,
		}).Result()
		if err != nil {
			if ctx.Err() != nil || errors.Is(err, goredis.Nil) {
				continue
			}
			c.log.Error("read failed", slog.String("error", err.Error()))
			select {
			case <-ctx.Done():
				return
			case <-time.After(time.Second):
			}
			continue
		}

		for _, stream := range streams {
			for _, msg := range stream.Messages {
				c.process(ctx, msg)
			}
		}
	}
}

func (c *Consumer) ensureGroup(ctx context.Context) error {
	err := c.rdb.Raw().XGroupCreateMkStream(ctx, c.cfg.Stream, c.cfg.Group, "0").Err()
	if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		return err
	}
	return nil
}

func (c *Consumer) process(ctx context.Context, msg goredis.XMessage) {
	env, ok := c.decode(msg)
	if !ok {
		c.ack(ctx, msg.ID)
		return
	}
	if _, want := c.wanted[env.EventType]; !want {
		c.ack(ctx, msg.ID)
		return
	}

	handlerCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), c.cfg.HandlerTimeout)
	err := c.handler(handlerCtx, env)
	cancel()

	if err != nil {
		c.log.Error("handler failed",
			slog.String("event_id", env.EventID),
			slog.String("event_type", env.EventType),
			slog.String("error", err.Error()),
		)
		return
	}
	c.ack(ctx, msg.ID)
}

func (c *Consumer) decode(msg goredis.XMessage) (Envelope, bool) {
	raw, ok := msg.Values["envelope"].(string)
	if !ok {
		c.log.Error("message has no envelope", slog.String("id", msg.ID))
		return Envelope{}, false
	}
	var env Envelope
	if err := json.Unmarshal([]byte(raw), &env); err != nil {
		c.log.Error("envelope is not json", slog.String("id", msg.ID), slog.String("error", err.Error()))
		return Envelope{}, false
	}
	return env, true
}

func (c *Consumer) ack(ctx context.Context, id string) {
	if err := c.rdb.Raw().XAck(ctx, c.cfg.Stream, c.cfg.Group, id).Err(); err != nil {
		c.log.Error("ack failed", slog.String("id", id), slog.String("error", err.Error()))
	}
}

func (c *Consumer) recoverPending(ctx context.Context) {
	pending, err := c.rdb.Raw().XPendingExt(ctx, &goredis.XPendingExtArgs{
		Stream: c.cfg.Stream,
		Group:  c.cfg.Group,
		Idle:   c.cfg.ClaimMinIdle,
		Start:  "-",
		End:    "+",
		Count:  c.cfg.BatchSize,
	}).Result()
	if err != nil || len(pending) == 0 {
		if err != nil && !errors.Is(err, goredis.Nil) && ctx.Err() == nil {
			c.log.Error("pending scan failed", slog.String("error", err.Error()))
		}
		return
	}

	for _, entry := range pending {
		if entry.RetryCount > c.cfg.MaxRetries {
			c.deadLetter(ctx, entry.ID, entry.RetryCount)
			continue
		}
		claimed, err := c.rdb.Raw().XClaim(ctx, &goredis.XClaimArgs{
			Stream:   c.cfg.Stream,
			Group:    c.cfg.Group,
			Consumer: c.cfg.Name,
			MinIdle:  c.cfg.ClaimMinIdle,
			Messages: []string{entry.ID},
		}).Result()
		if err != nil {
			continue
		}
		for _, msg := range claimed {
			c.process(ctx, msg)
		}
	}
}

func (c *Consumer) deadLetter(ctx context.Context, id string, attempts int64) {
	messages, err := c.rdb.Raw().XRange(ctx, c.cfg.Stream, id, id).Result()
	if err != nil || len(messages) == 0 {
		c.ack(ctx, id)
		return
	}

	values := map[string]any{"attempts": attempts, "original_id": id, "failed_at": time.Now().UTC().Format(time.RFC3339)}
	for k, v := range messages[0].Values {
		values[k] = v
	}

	if err := c.rdb.Raw().XAdd(ctx, &goredis.XAddArgs{Stream: c.cfg.DLQStream, Values: values}).Err(); err != nil {
		c.log.Error("dead letter failed", slog.String("id", id), slog.String("error", err.Error()))
		return
	}
	c.log.Warn("message dead lettered", slog.String("id", id), slog.Int64("attempts", attempts))
	c.ack(ctx, id)
}
