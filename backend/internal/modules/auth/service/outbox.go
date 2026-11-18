package service

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/model"
)

func buildOutboxEvent(evt Event, now time.Time) *model.OutboxEvent {
	payload, err := json.Marshal(evt.Payload)
	if err != nil {
		payload = []byte(`{}`)
	}
	return &model.OutboxEvent{
		EventID:     uuid.New(),
		EventType:   evt.Type,
		AggregateID: evt.AggregateID,
		TenantID:    evt.TenantID,
		Payload:     payload,
		Metadata:    []byte(`{}`),
		Status:      "PENDING",
		AvailableAt: now,
		CreatedAt:   now,
	}
}
