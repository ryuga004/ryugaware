package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/notification/model"
	"github.com/ryuga/ryugaware/backend/internal/platform/messaging"
)

var fixedNow = time.Date(2026, 11, 18, 9, 0, 0, 0, time.UTC)

type fakeRepo struct {
	templates  map[string]*model.EmailTemplate
	delivered  map[uuid.UUID]bool
	records    []*model.EmailDelivery
	lookupArgs []*uuid.UUID
	err        error
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		templates: map[string]*model.EmailTemplate{
			"email_verification": {
				Name:    "email_verification",
				Subject: "Verify your email address",
				Body:    "<p>Hi {{name}}, your code is {{otp}}. It expires in {{expiry_minutes}} minutes.</p>",
			},
		},
		delivered: map[uuid.UUID]bool{},
	}
}

func (f *fakeRepo) Template(ctx context.Context, tenantID *uuid.UUID, name string) (*model.EmailTemplate, error) {
	f.lookupArgs = append(f.lookupArgs, tenantID)
	if f.err != nil {
		return nil, f.err
	}
	return f.templates[name], nil
}

func (f *fakeRepo) AlreadyDelivered(ctx context.Context, eventID uuid.UUID) (bool, error) {
	return f.delivered[eventID], f.err
}

func (f *fakeRepo) RecordDelivery(ctx context.Context, d *model.EmailDelivery) error {
	f.records = append(f.records, d)
	f.delivered[d.EventID] = d.Status == model.StatusSent
	return f.err
}

type fakeMailer struct {
	sent []struct{ To, Subject, Body string }
	err  error
}

func (f *fakeMailer) Send(ctx context.Context, to, subject, body string) error {
	if f.err != nil {
		return f.err
	}
	f.sent = append(f.sent, struct{ To, Subject, Body string }{to, subject, body})
	return nil
}

func newService(t *testing.T) (*Service, *fakeRepo, *fakeMailer) {
	t.Helper()
	repo := newFakeRepo()
	mailer := &fakeMailer{}
	svc := New(repo, mailer).WithClock(func() time.Time { return fixedNow })
	return svc, repo, mailer
}

func envelope(eventType string, payload, metadata map[string]any) messaging.Envelope {
	return messaging.Envelope{
		EventID:   uuid.NewString(),
		EventType: eventType,
		Payload:   payload,
		Metadata:  metadata,
	}
}

func TestRender_ReplacesPlaceholdersAndEscapes(t *testing.T) {
	out := Render("Hi {{name}}, code {{ otp }}. {{missing}}|", map[string]string{
		"name": `Rahul <script>alert("x")</script>`,
		"otp":  "004291",
	})

	if strings.Contains(out, "<script>") {
		t.Fatalf("value was not escaped: %s", out)
	}
	if !strings.Contains(out, "004291") {
		t.Errorf("placeholder not replaced: %s", out)
	}
	if !strings.HasSuffix(out, "|") || strings.Contains(out, "{{missing}}") {
		t.Errorf("missing variable should render empty: %s", out)
	}
}

func TestHandleEvent_SendsRenderedTemplate(t *testing.T) {
	svc, _, mailer := newService(t)
	tenantID := uuid.New()

	env := envelope(EventEmailRequested, map[string]any{
		"template":       "email_verification",
		"to":             "user@example.com",
		"name":           "there",
		"otp":            "004291",
		"expiry_minutes": 5,
	}, map[string]any{"tenant_id": tenantID.String()})

	if err := svc.HandleEvent(context.Background(), env); err != nil {
		t.Fatalf("HandleEvent: %v", err)
	}
	if len(mailer.sent) != 1 {
		t.Fatalf("sent %d messages, want 1", len(mailer.sent))
	}
	sent := mailer.sent[0]
	if sent.To != "user@example.com" || sent.Subject != "Verify your email address" {
		t.Errorf("message = %+v", sent)
	}
	if !strings.Contains(sent.Body, "004291") || !strings.Contains(sent.Body, "expires in 5 minutes") {
		t.Errorf("body not rendered: %s", sent.Body)
	}
}

func TestHandleEvent_IgnoresOtherEventTypes(t *testing.T) {
	svc, _, mailer := newService(t)

	err := svc.HandleEvent(context.Background(), envelope("auth.user_logged_in", map[string]any{"user_id": "x"}, nil))

	if err != nil {
		t.Fatalf("HandleEvent: %v", err)
	}
	if len(mailer.sent) != 0 {
		t.Error("a non-email event was delivered")
	}
}

func TestSendTemplated_IsIdempotentOnRedelivery(t *testing.T) {
	svc, repo, mailer := newService(t)
	eventID := uuid.New()
	req := Request{
		EventID:   eventID,
		Template:  "email_verification",
		To:        "user@example.com",
		Variables: map[string]string{"name": "there", "otp": "004291", "expiry_minutes": "5"},
	}

	if err := svc.SendTemplated(context.Background(), req); err != nil {
		t.Fatalf("first send: %v", err)
	}
	if err := svc.SendTemplated(context.Background(), req); err != nil {
		t.Fatalf("redelivery: %v", err)
	}

	if len(mailer.sent) != 1 {
		t.Fatalf("sent %d messages, want 1 — redelivery must not send twice", len(mailer.sent))
	}
	if len(repo.records) != 1 || repo.records[0].Status != model.StatusSent {
		t.Errorf("records = %+v", repo.records)
	}
	if repo.records[0].SentAt == nil || !repo.records[0].SentAt.Equal(fixedNow) {
		t.Error("sent_at was not stamped with the service clock")
	}
}

func TestSendTemplated_RecordsFailureAndReturnsError(t *testing.T) {
	svc, repo, mailer := newService(t)
	mailer.err = errors.New("dial tcp 127.0.0.1:1025: connection refused")

	err := svc.SendTemplated(context.Background(), Request{
		EventID:   uuid.New(),
		Template:  "email_verification",
		To:        "user@example.com",
		Variables: map[string]string{"otp": "004291"},
	})

	if err == nil {
		t.Fatal("a failed send must return an error so the message is retried")
	}
	if len(repo.records) != 1 || repo.records[0].Status != model.StatusFailed {
		t.Fatalf("records = %+v, want one FAILED row", repo.records)
	}
	if repo.records[0].Error == nil || !strings.Contains(*repo.records[0].Error, "connection refused") {
		t.Error("the failure reason was not recorded")
	}
	if repo.records[0].SentAt != nil {
		t.Error("sent_at must stay empty for a failed send")
	}
}

func TestSendTemplated_UnknownTemplateFails(t *testing.T) {
	svc, _, mailer := newService(t)

	err := svc.SendTemplated(context.Background(), Request{
		EventID:  uuid.New(),
		Template: "does_not_exist",
		To:       "user@example.com",
	})

	if err == nil {
		t.Fatal("an unknown template must fail loudly")
	}
	if len(mailer.sent) != 0 {
		t.Error("nothing should have been sent")
	}
}

func TestHandleEvent_PrefersTheTenantTemplate(t *testing.T) {
	svc, repo, _ := newService(t)
	tenantID := uuid.New()

	env := envelope(EventEmailRequested, map[string]any{
		"template": "email_verification",
		"to":       "user@example.com",
	}, map[string]any{"tenant_id": tenantID.String()})

	if err := svc.HandleEvent(context.Background(), env); err != nil {
		t.Fatalf("HandleEvent: %v", err)
	}
	if len(repo.lookupArgs) != 1 || repo.lookupArgs[0] == nil || *repo.lookupArgs[0] != tenantID {
		t.Errorf("template lookup tenant = %v, want %s", repo.lookupArgs, tenantID)
	}
}
