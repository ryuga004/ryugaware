package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/delivery/dto"
	"github.com/ryuga/ryugaware/backend/internal/modules/delivery/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/delivery/service"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
	"github.com/ryuga/ryugaware/backend/internal/shared/binding"
	"github.com/ryuga/ryugaware/backend/internal/shared/middleware"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

type Handler struct {
	svc *service.Service
}

func New(svc *service.Service) *Handler { return &Handler{svc: svc} }

type listMeta struct {
	*response.PageMeta
	Counts dto.MethodCounts `json:"counts"`
}

var partnerLabels = map[string]string{
	model.PartnerShiprocket: "Shiprocket",
	model.PartnerSelf:       "Own fleet",
	model.PartnerPickup:     "Store pickup",
}

func scope(c *gin.Context) (uuid.UUID, uuid.UUID, bool) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		return uuid.Nil, uuid.Nil, false
	}
	tenantID, err := uuid.Parse(identity.TenantID)
	if err != nil {
		return uuid.Nil, uuid.Nil, false
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return tenantID, uuid.Nil, true
	}
	return tenantID, id, true
}

func (h *Handler) List(c *gin.Context) {
	tenantID, _, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	var q dto.ListQuery
	if err := binding.Query(c, &q); err != nil {
		response.Error(c, err)
		return
	}

	result, err := h.svc.List(c.Request.Context(), service.ListInput{
		TenantID: tenantID, Search: q.Search, Status: q.Status, Page: q.Page, PageSize: q.PageSize,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	items := make([]dto.Method, 0, len(result.Methods))
	for i := range result.Methods {
		items = append(items, toMethod(&result.Methods[i]))
	}
	response.List(c, items, listMeta{
		PageMeta: response.NewPageMeta(result.Page, result.PageSize, result.Total),
		Counts: dto.MethodCounts{
			All:      result.Total,
			Enabled:  result.Enabled,
			Disabled: result.Total - result.Enabled,
		},
	})
}

func (h *Handler) Get(c *gin.Context) {
	tenantID, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	m, err := h.svc.Get(c.Request.Context(), tenantID, id)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, toMethod(m))
}

func (h *Handler) Create(c *gin.Context) {
	tenantID, _, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	var in dto.MethodInput
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}

	m, err := h.svc.Create(c.Request.Context(), tenantID, service.MethodInput{
		Name: in.Name, Partner: in.Partner, Type: in.Type,
		MinDays: in.MinDays, MaxDays: in.MaxDays,
		RateType: in.RateType, Price: in.Price, FreeAbove: in.FreeAbove,
		Coverage: in.Coverage, Regions: in.Regions, Enabled: in.Enabled,
	})
	if err != nil {
		response.Error(c, err)
		return
	}
	c.Header("Location", "/api/v1/delivery/methods/"+m.ID.String())
	response.Created(c, toMethod(m))
}

func (h *Handler) Patch(c *gin.Context) {
	tenantID, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	var in dto.MethodUpdate
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}

	m, err := h.svc.Update(c.Request.Context(), tenantID, id, service.Patch{
		Name: in.Name, MinDays: in.MinDays, MaxDays: in.MaxDays,
		RateType: in.RateType, Price: in.Price, FreeAbove: in.FreeAbove,
		Coverage: in.Coverage, Regions: in.Regions, Enabled: in.Enabled,
	})
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, toMethod(m))
}

func (h *Handler) Delete(c *gin.Context) {
	tenantID, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	if err := h.svc.Delete(c.Request.Context(), tenantID, id); err != nil {
		response.Error(c, err)
		return
	}
	response.NoContent(c)
}

func (h *Handler) Process(c *gin.Context) {
	tenantID, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	var in dto.ConsignmentInput
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}

	result, err := h.svc.Process(c.Request.Context(), tenantID, id, service.Consignment{
		OrderID:   in.OrderID,
		Reference: in.OrderID,
		Pincode:   in.Pincode,
		ItemCount: in.ItemCount,
		OrderRs:   in.OrderRs,
	})
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, dto.DispatchResult{
		Status:       result.Dispatch.Status,
		AWB:          result.Dispatch.AWB,
		TrackingURL:  result.Dispatch.TrackingURL,
		PartnerLabel: result.Dispatch.PartnerLabel,
		MethodID:     result.Method.ID.String(),
		Fee:          result.FeeRs,
		Note:         result.Dispatch.Note,
	})
}

func toMethod(m *model.Method) dto.Method {
	return dto.Method{
		ID:           m.ID.String(),
		Name:         m.Name,
		Partner:      m.Partner,
		PartnerLabel: partnerLabels[m.Partner],
		Type:         m.Type,
		MinDays:      int(m.MinDays),
		MaxDays:      int(m.MaxDays),
		RateType:     m.RateType,
		Price:        m.Price,
		FreeAbove:    m.FreeAbove,
		Coverage:     m.Coverage,
		Regions:      service.Regions(m),
		Enabled:      m.Enabled,
		CreatedAt:    m.CreatedAt,
		UpdatedAt:    m.UpdatedAt,
	}
}
