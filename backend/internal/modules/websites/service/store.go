package service

import (
	"context"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/model"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

type StoreSettings struct {
	Payments []model.PaymentChoice
	Delivery []model.DeliveryChoice
}

type MethodSelection struct {
	ID       uuid.UUID
	Selected bool
}

type StorePatch struct {
	Payment  *MethodSelection
	Delivery *MethodSelection
}

func (s *Service) StoreSettings(ctx context.Context, tenantID, websiteID uuid.UUID) (*StoreSettings, error) {
	if _, err := s.Get(ctx, tenantID, websiteID); err != nil {
		return nil, err
	}
	return s.storeSettings(ctx, tenantID, websiteID)
}

func (s *Service) storeSettings(ctx context.Context, tenantID, websiteID uuid.UUID) (*StoreSettings, error) {
	payments, err := s.repo.PaymentChoices(ctx, tenantID, websiteID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	delivery, err := s.repo.DeliveryChoices(ctx, tenantID, websiteID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	return &StoreSettings{Payments: payments, Delivery: delivery}, nil
}

func (s *Service) UpdateStoreSettings(ctx context.Context, tenantID, websiteID uuid.UUID, p StorePatch) (*StoreSettings, error) {
	if p.Payment == nil && p.Delivery == nil {
		return nil, fieldError("payment", "choose a payment or delivery method to change")
	}
	if _, err := s.Get(ctx, tenantID, websiteID); err != nil {
		return nil, err
	}

	current, err := s.storeSettings(ctx, tenantID, websiteID)
	if err != nil {
		return nil, err
	}
	now := s.now().UTC()

	if sel := p.Payment; sel != nil {
		selected := 0
		found := false
		for i := range current.Payments {
			if current.Payments[i].Selected {
				selected++
			}
			if current.Payments[i].ID == sel.ID {
				found = true
			}
		}
		if !found {
			return nil, apperrors.NotFound("payment method")
		}
		if !sel.Selected && selected <= 1 {
			return nil, fieldError("payment", "keep at least one payment method on this website")
		}
		if sel.Selected {
			err = s.repo.SelectPaymentMethod(ctx, tenantID, websiteID, sel.ID, now)
		} else {
			err = s.repo.DeselectPaymentMethod(ctx, tenantID, websiteID, sel.ID)
		}
		if err != nil {
			return nil, apperrors.Internal(err)
		}
	}

	if sel := p.Delivery; sel != nil {
		selected := 0
		found := false
		for i := range current.Delivery {
			if current.Delivery[i].Selected {
				selected++
			}
			if current.Delivery[i].ID == sel.ID {
				found = true
			}
		}
		if !found {
			return nil, apperrors.NotFound("delivery method")
		}
		if !sel.Selected && selected <= 1 {
			return nil, fieldError("delivery", "keep at least one delivery method on this website")
		}
		if sel.Selected {
			err = s.repo.SelectDeliveryMethod(ctx, tenantID, websiteID, sel.ID, now)
		} else {
			err = s.repo.DeselectDeliveryMethod(ctx, tenantID, websiteID, sel.ID)
		}
		if err != nil {
			return nil, apperrors.Internal(err)
		}
	}

	return s.storeSettings(ctx, tenantID, websiteID)
}
