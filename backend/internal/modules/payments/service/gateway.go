package service

import (
	"context"
	"fmt"

	"github.com/ryuga/ryugaware/backend/internal/modules/payments/model"
)

type Charge struct {
	OrderID   string
	AmountRs  float64
	Reference string
	TestMode  bool
	KeyID     string
}

type ChargeOutcome struct {
	Status        string
	ProviderRef   string
	ProviderLabel string
	FailureReason string
}

const (
	StatusSucceeded = "succeeded"
	StatusPending   = "pending"
	StatusFailed    = "failed"
)

type Gateway interface {
	Provider() string
	Label() string
	NeedsCredentials() bool
	Authorize(ctx context.Context, c Charge) (ChargeOutcome, error)
}

type upiAdapter struct {
	provider string
	label    string
}

func (a upiAdapter) Provider() string       { return a.provider }
func (a upiAdapter) Label() string          { return a.label }
func (a upiAdapter) NeedsCredentials() bool { return true }

func (a upiAdapter) Authorize(ctx context.Context, c Charge) (ChargeOutcome, error) {
	if err := ctx.Err(); err != nil {
		return ChargeOutcome{}, err
	}
	return ChargeOutcome{
		Status:        StatusPending,
		ProviderRef:   fmt.Sprintf("%s_%s", a.provider, c.Reference),
		ProviderLabel: a.label,
	}, nil
}

type cardAdapter struct {
	provider string
	label    string
}

func (a cardAdapter) Provider() string       { return a.provider }
func (a cardAdapter) Label() string          { return a.label }
func (a cardAdapter) NeedsCredentials() bool { return true }

func (a cardAdapter) Authorize(ctx context.Context, c Charge) (ChargeOutcome, error) {
	if err := ctx.Err(); err != nil {
		return ChargeOutcome{}, err
	}
	return ChargeOutcome{
		Status:        StatusPending,
		ProviderRef:   fmt.Sprintf("%s_%s", a.provider, c.Reference),
		ProviderLabel: a.label,
	}, nil
}

type offlineGateway struct{}

func (offlineGateway) Provider() string       { return model.ProviderOffline }
func (offlineGateway) Label() string          { return "Cash on delivery" }
func (offlineGateway) NeedsCredentials() bool { return false }

func (offlineGateway) Authorize(ctx context.Context, c Charge) (ChargeOutcome, error) {
	if err := ctx.Err(); err != nil {
		return ChargeOutcome{}, err
	}
	return ChargeOutcome{
		Status:        StatusPending,
		ProviderRef:   "cod_" + c.Reference,
		ProviderLabel: "Cash on delivery",
	}, nil
}

func gatewaysByType() map[string]map[string]Gateway {
	return map[string]map[string]Gateway{
		model.TypeCOD: {
			model.ProviderOffline: offlineGateway{},
		},
		model.TypeUPI: {
			model.ProviderPhonePe: upiAdapter{provider: model.ProviderPhonePe, label: "PhonePe"},
			model.ProviderPaytm:   upiAdapter{provider: model.ProviderPaytm, label: "Paytm"},
			model.ProviderGPay:    upiAdapter{provider: model.ProviderGPay, label: "Google Pay"},
		},
		model.TypeCard: {
			model.ProviderRazorpay: cardAdapter{provider: model.ProviderRazorpay, label: "Razorpay"},
		},
	}
}
