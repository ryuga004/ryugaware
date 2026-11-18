package service

import (
	"context"
	"fmt"
	"html"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/notification/model"
)

const EventEmailRequested = "notification.email_requested"

var placeholder = regexp.MustCompile(`\{\{\s*([a-zA-Z0-9_]+)\s*\}\}`)

type Templates interface {
	Template(ctx context.Context, tenantID *uuid.UUID, name string) (*model.EmailTemplate, error)
	AlreadyDelivered(ctx context.Context, eventID uuid.UUID) (bool, error)
	RecordDelivery(ctx context.Context, d *model.EmailDelivery) error
}

type Mailer interface {
	Send(ctx context.Context, to, subject, body string) error
}

type Service struct {
	repo   Templates
	mailer Mailer
	now    func() time.Time
}

func New(repo Templates, mailer Mailer) *Service {
	return &Service{repo: repo, mailer: mailer, now: time.Now}
}

func (s *Service) WithClock(now func() time.Time) *Service {
	s.now = now
	return s
}

type Request struct {
	EventID   uuid.UUID
	TenantID  *uuid.UUID
	Template  string
	To        string
	Variables map[string]string
}

func (s *Service) SendTemplated(ctx context.Context, req Request) error {
	if req.Template == "" || req.To == "" {
		return fmt.Errorf("notification: event %s has no template or recipient", req.EventID)
	}

	delivered, err := s.repo.AlreadyDelivered(ctx, req.EventID)
	if err != nil {
		return err
	}
	if delivered {
		return nil
	}

	tpl, err := s.repo.Template(ctx, req.TenantID, req.Template)
	if err != nil {
		return err
	}
	if tpl == nil {
		return fmt.Errorf("notification: template %q not found", req.Template)
	}

	subject := Render(tpl.Subject, req.Variables)
	body := Render(tpl.Body, req.Variables)

	sendErr := s.mailer.Send(ctx, req.To, subject, body)
	now := s.now().UTC()

	record := &model.EmailDelivery{
		EventID:   req.EventID,
		TenantID:  req.TenantID,
		Template:  req.Template,
		ToAddress: req.To,
		Attempts:  1,
		CreatedAt: now,
	}
	if sendErr != nil {
		message := sendErr.Error()
		record.Status = model.StatusFailed
		record.Error = &message
		if err := s.repo.RecordDelivery(ctx, record); err != nil {
			return err
		}
		return sendErr
	}

	record.Status = model.StatusSent
	record.SentAt = &now
	return s.repo.RecordDelivery(ctx, record)
}

func Render(template string, vars map[string]string) string {
	return placeholder.ReplaceAllStringFunc(template, func(match string) string {
		key := strings.Trim(match, "{} \t")
		value, ok := vars[key]
		if !ok {
			return ""
		}
		return html.EscapeString(value)
	})
}
