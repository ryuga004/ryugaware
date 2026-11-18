package messaging

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type outboxRow struct {
	EventID   string `gorm:"column:event_id"`
	EventType string `gorm:"column:event_type"`
	TenantID  *string
	Payload   []byte `gorm:"column:payload"`
	Metadata  []byte `gorm:"column:metadata"`
	Attempts  int    `gorm:"column:attempts"`
}

type Relay struct {
	db        *gorm.DB
	publisher *Publisher
	log       *slog.Logger
	batchSize int
	interval  time.Duration
	backoff   time.Duration
}

func NewRelay(db *gorm.DB, publisher *Publisher, log *slog.Logger, batchSize int, interval, backoff time.Duration) *Relay {
	return &Relay{
		db:        db,
		publisher: publisher,
		log:       log,
		batchSize: batchSize,
		interval:  interval,
		backoff:   backoff,
	}
}

func (r *Relay) Run(ctx context.Context) {
	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if n, err := r.drain(ctx); err != nil {
				r.log.Error("outbox relay failed", slog.String("error", err.Error()))
			} else if n > 0 {
				r.log.Debug("outbox relay published", slog.Int("events", n))
			}
		}
	}
}

func (r *Relay) drain(ctx context.Context) (int, error) {
	published := 0
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var rows []outboxRow
		err := tx.Table("outbox_events").
			Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("status = ? AND available_at <= now()", "PENDING").
			Order("created_at").
			Limit(r.batchSize).
			Find(&rows).Error
		if err != nil {
			return err
		}

		for _, row := range rows {
			payload := map[string]any{}
			metadata := map[string]any{}
			_ = json.Unmarshal(row.Payload, &payload)
			_ = json.Unmarshal(row.Metadata, &metadata)

			env := Envelope{
				EventID:   row.EventID,
				EventType: row.EventType,
				Payload:   payload,
				Metadata:  metadata,
			}
			if err := r.publisher.Publish(ctx, env); err != nil {
				if err := tx.Table("outbox_events").
					Where("event_id = ?", row.EventID).
					Updates(map[string]any{
						"attempts":     row.Attempts + 1,
						"available_at": time.Now().UTC().Add(r.backoff),
					}).Error; err != nil {
					return err
				}
				continue
			}

			if err := tx.Table("outbox_events").
				Where("event_id = ?", row.EventID).
				Updates(map[string]any{
					"status":       "PUBLISHED",
					"published_at": time.Now().UTC(),
				}).Error; err != nil {
				return err
			}
			published++
		}
		return nil
	})
	return published, err
}
