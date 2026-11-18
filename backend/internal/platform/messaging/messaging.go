package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	goredis "github.com/redis/go-redis/v9"

	"github.com/ryuga/ryugaware/backend/internal/platform/redis"
)

type Envelope struct {
	EventID      string         `json:"event_id"`
	EventType    string         `json:"event_type"`
	EventVersion int            `json:"event_version"`
	Source       string         `json:"source"`
	OccurredAt   time.Time      `json:"occurred_at"`
	Payload      map[string]any `json:"payload"`
	Metadata     map[string]any `json:"metadata"`
}

type Publisher struct {
	rdb    *redis.Client
	stream string
	maxLen int64
	source string
}

func NewPublisher(rdb *redis.Client, stream string, maxLen int64, source string) *Publisher {
	return &Publisher{rdb: rdb, stream: stream, maxLen: maxLen, source: source}
}

func (p *Publisher) Publish(ctx context.Context, env Envelope) error {
	if env.EventID == "" {
		env.EventID = uuid.NewString()
	}
	if env.EventVersion == 0 {
		env.EventVersion = 1
	}
	if env.OccurredAt.IsZero() {
		env.OccurredAt = time.Now().UTC()
	}
	env.Source = p.source

	body, err := json.Marshal(env)
	if err != nil {
		return fmt.Errorf("messaging: marshal event: %w", err)
	}

	args := &goredis.XAddArgs{
		Stream: p.stream,
		Values: map[string]any{
			"event_id":   env.EventID,
			"event_type": env.EventType,
			"envelope":   string(body),
		},
	}
	if p.maxLen > 0 {
		args.MaxLen = p.maxLen
		args.Approx = true
	}

	if err := p.rdb.Raw().XAdd(ctx, args).Err(); err != nil {
		return fmt.Errorf("messaging: publish %s: %w", env.EventType, err)
	}
	return nil
}
