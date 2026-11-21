package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/payments/dto"
	"github.com/ryuga/ryugaware/backend/internal/modules/payments/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/payments/service"
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
		TenantID: tenantID, Search: q.Search, Type: q.Type, Page: q.Page, PageSize: q.PageSize,
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
		Counts:   dto.MethodCounts{All: result.Total, Enabled: result.Enabled},
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
		Type: in.Type, Provider: in.Provider, DisplayName: in.DisplayName,
		Enabled: in.Enabled, TestMode: in.TestMode,
		FeePercent: in.FeePercent, FeeFixed: in.FeeFixed,
		MinOrder: in.MinOrder, MaxOrder: in.MaxOrder,
		KeyID: in.KeyID, KeySecret: in.KeySecret,
	})
	if err != nil {
		response.Error(c, err)
		return
	}
	c.Header("Location", "/api/v1/payments/methods/"+m.ID.String())
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
		DisplayName: in.DisplayName, Enabled: in.Enabled, TestMode: in.TestMode,
		FeePercent: in.FeePercent, FeeFixed: in.FeeFixed,
		MinOrder: in.MinOrder, MaxOrder: in.MaxOrder,
		KeyID: in.KeyID, KeySecret: in.KeySecret,
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
	var in dto.ChargeInput
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}

	result, err := h.svc.Process(c.Request.Context(), tenantID, id, service.Charge{
		OrderID:   in.OrderID,
		AmountRs:  in.AmountRs,
		Reference: in.OrderID,
	})
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, dto.ChargeResult{
		Status:        result.Outcome.Status,
		ProviderRef:   result.Outcome.ProviderRef,
		ProviderLabel: result.Outcome.ProviderLabel,
		MethodID:      result.Method.ID.String(),
		MethodType:    result.Method.Type,
		Amount:        in.AmountRs,
		Fee:           result.FeeRs,
		FailureReason: result.Outcome.FailureReason,
	})
}

func toMethod(m *model.Method) dto.Method {
	return dto.Method{
		ID:          m.ID.String(),
		Type:        m.Type,
		Provider:    m.Provider,
		DisplayName: m.DisplayName,
		Enabled:     m.Enabled,
		TestMode:    m.TestMode,
		FeePercent:  m.FeePercent,
		FeeFixed:    m.FeeFixed,
		MinOrder:    m.MinOrder,
		MaxOrder:    m.MaxOrder,
		KeyIDMasked: maskKey(m.KeyID),
		HasSecret:   m.KeySecret != nil && *m.KeySecret != "",
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}

func maskKey(key *string) *string {
	if key == nil || *key == "" {
		return nil
	}
	k := *key
	if len(k) <= 12 {
		masked := "••••"
		return &masked
	}
	masked := k[:8] + "••••" + k[len(k)-4:]
	return &masked
}
