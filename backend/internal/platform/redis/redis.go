package redis

import (
	"context"
	"fmt"
	"strings"
	"time"

	goredis "github.com/redis/go-redis/v9"

	"github.com/ryuga/ryugaware/backend/internal/config"
)

type Client struct {
	rdb    *goredis.Client
	prefix string
}

func New(ctx context.Context, cfg config.Redis) (*Client, error) {
	rdb := goredis.NewClient(&goredis.Options{
		Addr:         cfg.Addr,
		Password:     cfg.Password,
		DB:           cfg.DB,
		PoolSize:     cfg.PoolSize,
		MinIdleConns: cfg.MinIdleConns,
		DialTimeout:  cfg.DialTimeout,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
	})

	pingCtx, cancel := context.WithTimeout(ctx, cfg.DialTimeout)
	defer cancel()
	if err := rdb.Ping(pingCtx).Err(); err != nil {
		_ = rdb.Close()
		return nil, fmt.Errorf("redis: connect %s: %w", cfg.Addr, err)
	}

	return &Client{rdb: rdb, prefix: strings.TrimSuffix(cfg.KeyPrefix, ":")}, nil
}

func (c *Client) Raw() *goredis.Client { return c.rdb }

func (c *Client) Ping(ctx context.Context) error { return c.rdb.Ping(ctx).Err() }

func (c *Client) Close() error { return c.rdb.Close() }

func Nil(err error) bool { return err == goredis.Nil }

func Script(src string) *goredis.Script { return goredis.NewScript(src) }

func TTLFloor(d time.Duration) time.Duration {
	if d <= 0 {
		return time.Second
	}
	return d
}
