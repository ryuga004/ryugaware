package handler

import (
	"encoding/json"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/templates/dto"
	"github.com/ryuga/ryugaware/backend/internal/modules/templates/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/templates/service"
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
	Categories []dto.CategoryCount `json:"categories"`
}

func tenantFrom(c *gin.Context) (uuid.UUID, bool) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		return uuid.Nil, false
	}
	tenantID, err := uuid.Parse(identity.TenantID)
	if err != nil {
		return uuid.Nil, false
	}
	return tenantID, true
}

func (h *Handler) List(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
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
		TenantID: tenantID,
		Search:   q.Search,
		Category: q.Category,
		Page:     q.Page,
		PageSize: q.PageSize,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	items := make([]dto.Template, 0, len(result.Templates))
	for i := range result.Templates {
		items = append(items, toTemplate(&result.Templates[i]))
	}

	categories := make([]dto.CategoryCount, 0, len(result.Categories)+1)
	var all int64
	for _, cat := range result.Categories {
		all += cat.Count
		categories = append(categories, dto.CategoryCount{ID: cat.Slug, Label: cat.Name, Count: cat.Count})
	}
	categories = append([]dto.CategoryCount{{ID: "all", Label: "All", Count: all}}, categories...)

	response.List(c, items, listMeta{
		PageMeta:   response.NewPageMeta(result.Page, result.PageSize, result.Total),
		Categories: categories,
	})
}

func (h *Handler) Get(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}

	detail, err := h.svc.Get(c.Request.Context(), tenantID, c.Param("slug"))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, toTemplate(&detail.Template))
}

func (h *Handler) GetPage(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}

	page, err := h.svc.Page(c.Request.Context(), tenantID, c.Param("slug"), c.Param("key"))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, toPage(page))
}

func toTemplate(row *model.TemplateListRow) dto.Template {
	return dto.Template{
		ID:             row.Slug,
		Slug:           row.Slug,
		Name:           row.Name,
		Category:       row.CategorySlug,
		Description:    row.Description,
		Pages:          row.PageCount,
		Features:       stringList(row.Features),
		PaymentMethods: stringList(row.PaymentMethods),
		ThumbnailTheme: row.ThumbnailTheme,
		Version:        row.Version,
		Status:         row.Status,
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
}

func toPage(p *model.Page) dto.Page {
	return dto.Page{
		ID:         p.Key,
		Key:        p.Key,
		Path:       p.Path,
		Kind:       p.Kind,
		SortOrder:  int(p.SortOrder),
		PreviewURL: text(p.PreviewURL),
	}
}

func stringList(raw []byte) []string {
	out := []string{}
	if len(raw) == 0 {
		return out
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return []string{}
	}
	return out
}

func text(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
