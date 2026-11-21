package service

import (
	"context"
	"fmt"

	"github.com/ryuga/ryugaware/backend/internal/modules/payments/model"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

type MethodInput struct {
	Type        string
	Provider    string
	DisplayName string
	Enabled     bool
	TestMode    bool
	FeePercent  float64
	FeeFixed    float64
	MinOrder    *float64
	MaxOrder    *float64
	KeyID       string
	KeySecret   string
}

type Strategy interface {
	Type() string
	Create(ctx context.Context, in MethodInput) error
	Process(ctx context.Context, m *model.Method, c Charge) (ChargeOutcome, error)
}

type baseStrategy struct {
	kind     string
	gateways map[string]Gateway
}

func (s baseStrategy) Type() string { return s.kind }

func (s baseStrategy) gateway(provider string) (Gateway, error) {
	g, ok := s.gateways[provider]
	if !ok {
		return nil, apperrors.Validation("the request is invalid", apperrors.FieldError{
			Field:   "provider",
			Message: fmt.Sprintf("%q is not a supported %s provider", provider, s.kind),
		})
	}
	return g, nil
}

type codStrategy struct{ baseStrategy }

func (s codStrategy) Create(ctx context.Context, in MethodInput) error {
	if _, err := s.gateway(in.Provider); err != nil {
		return err
	}
	if in.KeyID != "" || in.KeySecret != "" {
		return fieldError("keyId", "cash on delivery takes no gateway credentials")
	}
	if in.TestMode {
		return fieldError("testMode", "cash on delivery has no test mode")
	}
	if in.FeePercent != 0 {
		return fieldError("feePercent", "cash on delivery has no percentage fee")
	}
	if in.MinOrder != nil && in.MaxOrder != nil && *in.MaxOrder < *in.MinOrder {
		return fieldError("maxOrder", "the maximum must be at least the minimum")
	}
	return nil
}

func (s codStrategy) Process(ctx context.Context, m *model.Method, c Charge) (ChargeOutcome, error) {
	if m.MinOrder != nil && c.AmountRs < *m.MinOrder {
		return ChargeOutcome{}, apperrors.Validation("this order is below the cash-on-delivery minimum")
	}
	if m.MaxOrder != nil && c.AmountRs > *m.MaxOrder {
		return ChargeOutcome{}, apperrors.Validation("this order is above the cash-on-delivery maximum")
	}
	g, err := s.gateway(m.Provider)
	if err != nil {
		return ChargeOutcome{}, err
	}
	return g.Authorize(ctx, c)
}

type gatewayStrategy struct{ baseStrategy }

func (s gatewayStrategy) Create(ctx context.Context, in MethodInput) error {
	g, err := s.gateway(in.Provider)
	if err != nil {
		return err
	}
	if g.NeedsCredentials() && in.KeyID == "" {
		return fieldError("keyId", "add the key id from your "+g.Label()+" dashboard")
	}
	if in.MinOrder != nil || in.MaxOrder != nil {
		return fieldError("minOrder", "order limits apply to cash on delivery only")
	}
	return nil
}

func (s gatewayStrategy) Process(ctx context.Context, m *model.Method, c Charge) (ChargeOutcome, error) {
	g, err := s.gateway(m.Provider)
	if err != nil {
		return ChargeOutcome{}, err
	}
	if g.NeedsCredentials() && (m.KeyID == nil || *m.KeyID == "") {
		return ChargeOutcome{}, apperrors.Validation("this payment method has no gateway credentials")
	}
	if m.KeyID != nil {
		c.KeyID = *m.KeyID
	}
	c.TestMode = m.TestMode
	return g.Authorize(ctx, c)
}

func fieldError(field, message string) error {
	return apperrors.Validation("the request is invalid", apperrors.FieldError{Field: field, Message: message})
}

func strategies() map[string]Strategy {
	g := gatewaysByType()
	return map[string]Strategy{
		model.TypeCOD:  codStrategy{baseStrategy{kind: model.TypeCOD, gateways: g[model.TypeCOD]}},
		model.TypeUPI:  gatewayStrategy{baseStrategy{kind: model.TypeUPI, gateways: g[model.TypeUPI]}},
		model.TypeCard: gatewayStrategy{baseStrategy{kind: model.TypeCard, gateways: g[model.TypeCard]}},
	}
}
