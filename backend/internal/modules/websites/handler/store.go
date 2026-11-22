package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/dto"
	"github.com/ryuga/ryugaware/backend/internal/modules/websites/service"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
	"github.com/ryuga/ryugaware/backend/internal/shared/binding"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

func (h *Handler) GetStoreSettings(c *gin.Context) {
	tenantID, _, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	settings, err := h.svc.StoreSettings(c.Request.Context(), tenantID, id)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, toStoreSettings(id, settings))
}

func (h *Handler) PatchStoreSettings(c *gin.Context) {
	tenantID, _, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}

	var in dto.StoreSettingsPatch
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}

	patch := service.StorePatch{}
	if in.Payment != nil {
		methodID, err := uuid.Parse(in.Payment.ID)
		if err != nil {
			response.Error(c, apperrors.NotFound("payment method"))
			return
		}
		patch.Payment = &service.MethodSelection{ID: methodID, Selected: in.Payment.Selected}
	}
	if in.Delivery != nil {
		methodID, err := uuid.Parse(in.Delivery.ID)
		if err != nil {
			response.Error(c, apperrors.NotFound("delivery method"))
			return
		}
		patch.Delivery = &service.MethodSelection{ID: methodID, Selected: in.Delivery.Selected}
	}

	settings, err := h.svc.UpdateStoreSettings(c.Request.Context(), tenantID, id, patch)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, toStoreSettings(id, settings))
}

func toStoreSettings(websiteID uuid.UUID, in *service.StoreSettings) dto.StoreSettings {
	payments := make([]dto.WebsitePaymentOption, 0, len(in.Payments))
	for _, p := range in.Payments {
		payments = append(payments, dto.WebsitePaymentOption{
			ID:              p.ID.String(),
			Type:            p.Type,
			Provider:        p.Provider,
			DisplayName:     p.DisplayName,
			EnabledGlobally: p.Enabled,
			TestMode:        p.TestMode,
			FeePercent:      p.FeePercent,
			FeeFixed:        p.FeeFixed,
			MinOrder:        p.MinOrder,
			MaxOrder:        p.MaxOrder,
			Selected:        p.Selected,
		})
	}

	delivery := make([]dto.WebsiteDeliveryOption, 0, len(in.Delivery))
	for _, d := range in.Delivery {
		delivery = append(delivery, dto.WebsiteDeliveryOption{
			ID:              d.ID.String(),
			Name:            d.Name,
			Type:            d.Type,
			Carrier:         carrierLabel(d.Partner),
			MinDays:         int(d.MinDays),
			MaxDays:         int(d.MaxDays),
			RateType:        d.RateType,
			Price:           d.Price,
			FreeAbove:       d.FreeAbove,
			Coverage:        d.Coverage,
			EnabledGlobally: d.Enabled,
			Selected:        d.Selected,
		})
	}

	return dto.StoreSettings{WebsiteID: websiteID.String(), Payments: payments, Delivery: delivery}
}

func carrierLabel(partner string) string {
	if label, ok := partnerLabel[partner]; ok {
		return label
	}
	return partner
}
