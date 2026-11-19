package service

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/templates/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/templates/repository"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
	MaxSearchLength = 80
)

type Repo interface {
	List(ctx context.Context, f repository.Filter) ([]model.TemplateListRow, error)
	Count(ctx context.Context, f repository.Filter) (int64, error)
	CategoryCounts(ctx context.Context, tenantID uuid.UUID) ([]model.CategoryCount, error)
	GetBySlug(ctx context.Context, tenantID uuid.UUID, slug string) (*model.TemplateListRow, error)
	ListPages(ctx context.Context, templateID uuid.UUID) ([]model.Page, error)
	GetPage(ctx context.Context, templateID uuid.UUID, key string) (*model.Page, error)
}

type Service struct {
	repo Repo
}

func New(repo Repo) *Service { return &Service{repo: repo} }

type ListInput struct {
	TenantID uuid.UUID
	Search   string
	Category string
	Page     int
	PageSize int
}

type ListResult struct {
	Templates  []model.TemplateListRow
	Categories []model.CategoryCount
	Page       int
	PageSize   int
	Total      int64
}

type Detail struct {
	Template model.TemplateListRow
	Pages    []model.Page
}

func (s *Service) List(ctx context.Context, in ListInput) (*ListResult, error) {
	search := strings.TrimSpace(in.Search)
	if len(search) > MaxSearchLength {
		return nil, apperrors.Validation("the request is invalid", apperrors.FieldError{
			Field:   "search",
			Message: "use 80 characters or fewer",
		})
	}

	page := in.Page
	if page < 1 {
		page = 1
	}
	pageSize := in.PageSize
	if pageSize < 1 {
		pageSize = DefaultPageSize
	}
	if pageSize > MaxPageSize {
		pageSize = MaxPageSize
	}

	category := in.Category
	if category == "all" {
		category = ""
	}

	filter := repository.Filter{
		TenantID: in.TenantID,
		Search:   search,
		Category: category,
		Limit:    pageSize,
		Offset:   (page - 1) * pageSize,
	}

	total, err := s.repo.Count(ctx, filter)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	rows, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	categories, err := s.repo.CategoryCounts(ctx, in.TenantID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	return &ListResult{
		Templates:  rows,
		Categories: categories,
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
	}, nil
}

func (s *Service) Get(ctx context.Context, tenantID uuid.UUID, slug string) (*Detail, error) {
	row, err := s.repo.GetBySlug(ctx, tenantID, slug)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if row == nil {
		return nil, apperrors.NotFound("template")
	}
	pages, err := s.repo.ListPages(ctx, row.ID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	return &Detail{Template: *row, Pages: pages}, nil
}

func (s *Service) Page(ctx context.Context, tenantID uuid.UUID, slug, key string) (*model.Page, error) {
	row, err := s.repo.GetBySlug(ctx, tenantID, slug)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if row == nil {
		return nil, apperrors.NotFound("template")
	}
	page, err := s.repo.GetPage(ctx, row.ID, key)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if page == nil {
		return nil, apperrors.NotFound("template page")
	}
	return page, nil
}
