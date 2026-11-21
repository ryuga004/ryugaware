package handler

import (
	"encoding/json"
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/dto"
	"github.com/ryuga/ryugaware/backend/internal/modules/websites/service"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
	"github.com/ryuga/ryugaware/backend/internal/shared/binding"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

var paymentKind = map[string]string{
	"cod":  "cod",
	"upi":  "upi",
	"card": "card",
}

var paymentHint = map[string]string{
	"cod":  "Pay the courier when your order arrives",
	"upi":  "Pay instantly from any UPI app",
	"card": "Credit or debit card",
}

var partnerLabel = map[string]string{
	"shiprocket": "Shiprocket",
	"self":       "Own fleet",
	"pickup":     "Store pickup",
}

func (h *Handler) GetContent(c *gin.Context) {
	tenantID, _, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	content, err := h.svc.Content(c.Request.Context(), tenantID, id)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, toContent(content))
}

func (h *Handler) SaveContent(c *gin.Context) {
	tenantID, _, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	var in dto.SaveContentInput
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}

	pages := make([]service.PageContent, 0, len(in.Pages))
	for _, p := range in.Pages {
		pages = append(pages, service.PageContent{
			Key: p.Key, Title: p.Title, Enabled: p.Enabled,
			SEO: p.SEO, Sections: p.Sections, Settings: p.Settings,
		})
	}

	content, err := h.svc.SaveContent(c.Request.Context(), tenantID, id, service.SaveContentInput{
		Theme: in.Theme, Chrome: in.Chrome, Pages: pages,
	})
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, toContent(content))
}

func (h *Handler) Storefront(c *gin.Context) {
	front, err := h.svc.StorefrontBySubdomain(c.Request.Context(), c.Param("site"))
	if err != nil {
		response.Error(c, err)
		return
	}

	w := front.Content.Website
	response.OK(c, dto.StorefrontResponse{
		WebsiteID: w.ID.String(),
		Name:      w.Name,
		Subdomain: w.Subdomain,
		Status:    w.Status,
		Preview:   false,
		Content:   toContent(&front.Content),
		Commerce:  toCommerce(front.Commerce),
	})
}

func toContent(in *service.Content) dto.SiteContent {
	w := in.Website
	pages := make([]dto.SitePage, 0, len(in.Pages))
	for i := range in.Pages {
		p := &in.Pages[i]
		pages = append(pages, dto.SitePage{
			ID:       "pg_" + p.Key,
			Key:      p.Key,
			Path:     p.Path,
			Title:    p.Title,
			Kind:     p.Kind,
			Enabled:  p.Enabled,
			SEO:      raw(p.SEO, "{}"),
			Sections: raw(p.Sections, "[]"),
			Settings: raw(p.Settings, "{}"),
		})
	}
	return dto.SiteContent{
		WebsiteID:       w.ID.String(),
		TemplateID:      w.TemplateSlug,
		TemplateVersion: w.TemplateVersion,
		Theme:           raw(w.Theme, "{}"),
		Chrome:          raw(w.Chrome, "[]"),
		Pages:           pages,
		UpdatedAt:       w.UpdatedAt,
	}
}

func toCommerce(in service.Commerce) dto.StoreCommerce {
	payments := make([]dto.CheckoutPayment, 0, len(in.Payments))
	for _, p := range in.Payments {
		payments = append(payments, dto.CheckoutPayment{
			ID:       p.ID.String(),
			Kind:     paymentKind[p.Type],
			Label:    p.DisplayName,
			Hint:     paymentHint[p.Type],
			Mark:     "/images/marks/payment-" + p.Type + ".webp",
			Fee:      p.FeeFixed,
			MinOrder: p.MinOrder,
			MaxOrder: p.MaxOrder,
			TestMode: p.TestMode,
		})
	}

	delivery := make([]dto.CheckoutDelivery, 0, len(in.Delivery))
	for _, d := range in.Delivery {
		delivery = append(delivery, dto.CheckoutDelivery{
			ID:        d.ID.String(),
			Name:      d.Name,
			Carrier:   partnerLabel[d.Partner],
			DaysLabel: daysLabel(int(d.MinDays), int(d.MaxDays)),
			MaxDays:   int(d.MaxDays),
			RateType:  d.RateType,
			Price:     d.Price,
			FreeAbove: d.FreeAbove,
			Mark:      "/images/marks/carrier-self.webp",
		})
	}

	return dto.StoreCommerce{
		Payments: payments,
		Delivery: delivery,
		SignIn:   dto.SignIn{Email: true, Google: false},
	}
}

func daysLabel(min, max int) string {
	if max == 0 {
		return "Same day"
	}
	if min == max {
		if min == 1 {
			return "1 day"
		}
		return fmt.Sprintf("%d days", min)
	}
	return fmt.Sprintf("%d–%d days", min, max)
}

func raw(b []byte, fallback string) json.RawMessage {
	if len(b) == 0 {
		return json.RawMessage(fallback)
	}
	return json.RawMessage(b)
}
