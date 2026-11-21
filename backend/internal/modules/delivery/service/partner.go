package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/ryuga/ryugaware/backend/internal/modules/delivery/model"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

type Consignment struct {
	OrderID   string
	Reference string
	Pincode   string
	ItemCount int
	OrderRs   float64
}

type Dispatch struct {
	Status       string
	AWB          string
	TrackingURL  string
	PartnerLabel string
	Note         string
}

const (
	StatusProcessing = "processing"
	StatusReady      = "ready_for_pickup"
)

type Partner interface {
	Name() string
	Label() string
	Create(ctx context.Context, in MethodInput) error
	Process(ctx context.Context, m *model.Method, c Consignment) (Dispatch, error)
}

type shiprocketPartner struct{}

func (shiprocketPartner) Name() string  { return model.PartnerShiprocket }
func (shiprocketPartner) Label() string { return "Shiprocket" }

func (shiprocketPartner) Create(ctx context.Context, in MethodInput) error {
	if in.Type == "pickup" {
		return fieldError("type", "Shiprocket does not handle store pickup")
	}
	if in.MaxDays == 0 {
		return fieldError("maxDays", "give Shiprocket a delivery window of at least one day")
	}
	return nil
}

func (shiprocketPartner) Process(ctx context.Context, m *model.Method, c Consignment) (Dispatch, error) {
	if err := ctx.Err(); err != nil {
		return Dispatch{}, err
	}
	if strings.TrimSpace(c.Pincode) == "" {
		return Dispatch{}, fieldError("pincode", "Shiprocket needs a destination PIN code")
	}
	return Dispatch{
		Status:       StatusProcessing,
		AWB:          fmt.Sprintf("SR%s", c.Reference),
		TrackingURL:  "https://shiprocket.co/tracking/SR" + c.Reference,
		PartnerLabel: "Shiprocket",
	}, nil
}

type selfPartner struct{}

func (selfPartner) Name() string  { return model.PartnerSelf }
func (selfPartner) Label() string { return "Own fleet" }

func (selfPartner) Create(ctx context.Context, in MethodInput) error {
	if in.Type == "pickup" {
		return fieldError("type", "choose the pickup partner for store pickup")
	}
	return nil
}

func (selfPartner) Process(ctx context.Context, m *model.Method, c Consignment) (Dispatch, error) {
	if err := ctx.Err(); err != nil {
		return Dispatch{}, err
	}
	return Dispatch{
		Status:       StatusProcessing,
		AWB:          "OWN" + c.Reference,
		PartnerLabel: "Own fleet",
		Note:         "Assign a rider from the shipments screen",
	}, nil
}

type pickupPartner struct{}

func (pickupPartner) Name() string  { return model.PartnerPickup }
func (pickupPartner) Label() string { return "Store pickup" }

func (pickupPartner) Create(ctx context.Context, in MethodInput) error {
	if in.Type != "pickup" {
		return fieldError("type", "the pickup partner only serves store pickup")
	}
	if in.RateType != model.RateFree {
		return fieldError("rateType", "store pickup cannot charge a delivery fee")
	}
	return nil
}

func (pickupPartner) Process(ctx context.Context, m *model.Method, c Consignment) (Dispatch, error) {
	if err := ctx.Err(); err != nil {
		return Dispatch{}, err
	}
	return Dispatch{
		Status:       StatusReady,
		PartnerLabel: "Store pickup",
		Note:         "Waiting for the customer to collect",
	}, nil
}

func partners() map[string]Partner {
	return map[string]Partner{
		model.PartnerShiprocket: shiprocketPartner{},
		model.PartnerSelf:       selfPartner{},
		model.PartnerPickup:     pickupPartner{},
	}
}

func fieldError(field, message string) error {
	return apperrors.Validation("the request is invalid", apperrors.FieldError{Field: field, Message: message})
}
