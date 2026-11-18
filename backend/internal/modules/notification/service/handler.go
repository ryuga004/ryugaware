package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/platform/messaging"
)

func (s *Service) HandleEvent(ctx context.Context, env messaging.Envelope) error {
	if env.EventType != EventEmailRequested {
		return nil
	}

	eventID, err := uuid.Parse(env.EventID)
	if err != nil {
		return fmt.Errorf("notification: event id %q is not a uuid", env.EventID)
	}

	req := Request{
		EventID:   eventID,
		Variables: map[string]string{},
	}

	for key, value := range env.Payload {
		text := fmt.Sprint(value)
		switch key {
		case "template":
			req.Template = text
		case "to":
			req.To = text
		default:
			req.Variables[key] = text
		}
	}

	if raw, ok := env.Metadata["tenant_id"]; ok {
		if tenantID, err := uuid.Parse(fmt.Sprint(raw)); err == nil {
			req.TenantID = &tenantID
		}
	}

	return s.SendTemplated(ctx, req)
}
