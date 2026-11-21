package handler

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/dto"
	"github.com/ryuga/ryugaware/backend/internal/modules/websites/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/websites/service"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
	"github.com/ryuga/ryugaware/backend/internal/shared/binding"
	"github.com/ryuga/ryugaware/backend/internal/shared/middleware"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

type Config struct {
	BaseDomain string
}

type Handler struct {
	svc *service.Service
	cfg Config
}

func New(svc *service.Service, cfg Config) *Handler { return &Handler{svc: svc, cfg: cfg} }

type listMeta struct {
	*response.PageMeta
	Counts dto.Counts `json:"counts"`
}

func scope(c *gin.Context) (uuid.UUID, uuid.UUID, uuid.UUID, bool) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		return uuid.Nil, uuid.Nil, uuid.Nil, false
	}
	tenantID, err := uuid.Parse(identity.TenantID)
	if err != nil {
		return uuid.Nil, uuid.Nil, uuid.Nil, false
	}
	userID, _ := uuid.Parse(identity.UserID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return tenantID, userID, uuid.Nil, true
	}
	return tenantID, userID, id, true
}

func (h *Handler) List(c *gin.Context) {
	tenantID, _, _, ok := scope(c)
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

	items := make([]dto.Website, 0, len(result.Websites))
	for i := range result.Websites {
		items = append(items, h.toWebsite(&result.Websites[i]))
	}
	counts := dto.Counts{
		Live:   result.Counts[model.StatusLive],
		Draft:  result.Counts[model.StatusDraft],
		Paused: result.Counts[model.StatusPaused],
	}
	counts.All = counts.Live + counts.Draft + counts.Paused

	response.List(c, items, listMeta{
		PageMeta: response.NewPageMeta(result.Page, result.PageSize, result.Total),
		Counts:   counts,
	})
}

func (h *Handler) CheckSubdomain(c *gin.Context) {
	if _, _, _, ok := scope(c); !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	var q dto.SubdomainQuery
	if err := binding.Query(c, &q); err != nil {
		response.Error(c, err)
		return
	}
	check, err := h.svc.CheckSubdomain(c.Request.Context(), q.Subdomain)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, dto.SubdomainCheck{
		Subdomain: check.Subdomain, Available: check.Available, Suggestion: check.Suggestion,
	})
}

func (h *Handler) Get(c *gin.Context) {
	tenantID, _, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	w, err := h.svc.Get(c.Request.Context(), tenantID, id)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, h.toWebsite(w))
}

func (h *Handler) Create(c *gin.Context) {
	tenantID, userID, _, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	var in dto.CreateInput
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}

	disabled := make(map[string]bool, len(in.DisabledPages))
	for _, key := range in.DisabledPages {
		disabled[key] = true
	}

	theme := map[string]any{}
	if in.BrandName != "" {
		theme["brandName"] = in.BrandName
	}
	if in.Description != "" {
		theme["brandDescription"] = in.Description
	}
	if in.Primary != "" {
		theme["primary"] = in.Primary
	}
	if in.Secondary != "" {
		theme["secondary"] = in.Secondary
	}
	if in.FontPair != "" {
		theme["fontPair"] = in.FontPair
	}

	w, err := h.svc.Create(c.Request.Context(), service.CreateInput{
		TenantID:     tenantID,
		CreatedBy:    userID,
		Name:         in.Name,
		Subdomain:    in.Subdomain,
		TemplateSlug: in.TemplateID,
		Theme:        theme,
		DisabledPage: disabled,
	})
	if err != nil {
		response.Error(c, err)
		return
	}
	c.Header("Location", "/api/v1/websites/"+w.ID.String())
	response.Created(c, h.toWebsite(w))
}

func (h *Handler) Patch(c *gin.Context) {
	tenantID, _, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	var in dto.UpdateInput
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}

	w, err := h.svc.Update(c.Request.Context(), tenantID, id, service.Patch{
		Name: in.Name, Status: in.Status, Publish: in.Publish,
	})
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, h.toWebsite(w))
}

func (h *Handler) Delete(c *gin.Context) {
	tenantID, _, id, ok := scope(c)
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

func (h *Handler) Pages(c *gin.Context) {
	tenantID, _, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}
	pages, err := h.svc.Pages(c.Request.Context(), tenantID, id)
	if err != nil {
		response.Error(c, err)
		return
	}
	items := make([]dto.Page, 0, len(pages))
	for i := range pages {
		p := &pages[i]
		items = append(items, dto.Page{
			ID: p.ID.String(), Key: p.Key, Path: p.Path, Kind: p.Kind,
			Title: p.Title, Enabled: p.Enabled, SortOrder: int(p.SortOrder),
		})
	}
	response.OK(c, items)
}

func (h *Handler) toWebsite(w *model.WebsiteRow) dto.Website {
	return dto.Website{
		ID:              w.ID.String(),
		Name:            w.Name,
		Status:          w.Status,
		Subdomain:       w.Subdomain,
		URL:             h.url(w),
		CustomDomain:    w.CustomDomain,
		TemplateID:      w.TemplateSlug,
		TemplateName:    w.TemplateName,
		ThumbnailTheme:  w.ThumbnailTheme,
		TemplateVersion: w.TemplateVersion,
		StoragePrefix:   w.StoragePrefix,
		CreatedAt:       w.CreatedAt,
		UpdatedAt:       w.UpdatedAt,
		LastPublishedAt: w.PublishedAt,
	}
}

func (h *Handler) url(w *model.WebsiteRow) string {
	if w.CustomDomain != nil && *w.CustomDomain != "" {
		return "https://" + *w.CustomDomain
	}
	domain := h.cfg.BaseDomain
	if domain == "" {
		domain = "ryugaware.com"
	}
	return "https://" + w.Subdomain + "." + strings.TrimPrefix(domain, ".")
}
