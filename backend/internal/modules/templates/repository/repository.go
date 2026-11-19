package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/ryuga/ryugaware/backend/internal/modules/templates/model"
)

const statusPublished = "published"

type Repository struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Repository { return &Repository{db: db} }

type Filter struct {
	TenantID uuid.UUID
	Search   string
	Category string
	Limit    int
	Offset   int
}

func (r *Repository) visible(ctx context.Context, tenantID uuid.UUID) *gorm.DB {
	return r.db.WithContext(ctx).
		Model(&model.Template{}).
		Where("templates.status = ?", statusPublished).
		Where("(templates.tenant_id IS NULL OR templates.tenant_id = ?)", tenantID)
}

func (r *Repository) filtered(ctx context.Context, f Filter) *gorm.DB {
	q := r.visible(ctx, f.TenantID).
		Joins("JOIN template_categories c ON c.id = templates.category_id")
	if f.Category != "" {
		q = q.Where("c.slug = ?", f.Category)
	}
	if f.Search != "" {
		pattern := "%" + f.Search + "%"
		q = q.Where("(templates.name ILIKE ? OR templates.description ILIKE ?)", pattern, pattern)
	}
	return q
}

func (r *Repository) List(ctx context.Context, f Filter) ([]model.TemplateListRow, error) {
	rows := make([]model.TemplateListRow, 0, f.Limit)
	err := r.filtered(ctx, f).
		Select("templates.*, c.slug AS category_slug, (SELECT count(*) FROM template_pages p WHERE p.template_id = templates.id) AS page_count").
		Order("templates.name ASC, templates.id ASC").
		Limit(f.Limit).
		Offset(f.Offset).
		Find(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("templates: list: %w", err)
	}
	return rows, nil
}

func (r *Repository) Count(ctx context.Context, f Filter) (int64, error) {
	var total int64
	if err := r.filtered(ctx, f).Count(&total).Error; err != nil {
		return 0, fmt.Errorf("templates: count: %w", err)
	}
	return total, nil
}

func (r *Repository) CategoryCounts(ctx context.Context, tenantID uuid.UUID) ([]model.CategoryCount, error) {
	counts := make([]model.CategoryCount, 0, 8)
	err := r.db.WithContext(ctx).
		Table("template_categories c").
		Select("c.slug AS slug, c.name AS name, count(t.id) AS count").
		Joins("LEFT JOIN templates t ON t.category_id = c.id AND t.status = ? AND (t.tenant_id IS NULL OR t.tenant_id = ?)", statusPublished, tenantID).
		Group("c.slug, c.name, c.sort_order").
		Order("c.sort_order ASC").
		Scan(&counts).Error
	if err != nil {
		return nil, fmt.Errorf("templates: category counts: %w", err)
	}
	return counts, nil
}

func (r *Repository) GetBySlug(ctx context.Context, tenantID uuid.UUID, slug string) (*model.TemplateListRow, error) {
	var row model.TemplateListRow
	err := r.visible(ctx, tenantID).
		Joins("JOIN template_categories c ON c.id = templates.category_id").
		Select("templates.*, c.slug AS category_slug, (SELECT count(*) FROM template_pages p WHERE p.template_id = templates.id) AS page_count").
		Where("templates.slug = ?", slug).
		First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("templates: get by slug: %w", err)
	}
	return &row, nil
}

func (r *Repository) ListPages(ctx context.Context, templateID uuid.UUID) ([]model.Page, error) {
	pages := make([]model.Page, 0, 16)
	err := r.db.WithContext(ctx).
		Where("template_id = ?", templateID).
		Order("sort_order ASC, id ASC").
		Find(&pages).Error
	if err != nil {
		return nil, fmt.Errorf("templates: list pages: %w", err)
	}
	return pages, nil
}

func (r *Repository) GetPage(ctx context.Context, templateID uuid.UUID, key string) (*model.Page, error) {
	var page model.Page
	err := r.db.WithContext(ctx).
		Where("template_id = ? AND key = ?", templateID, key).
		First(&page).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("templates: get page: %w", err)
	}
	return &page, nil
}
