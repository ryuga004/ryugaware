package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/model"
	"github.com/ryuga/ryugaware/backend/internal/platform/database"
)

type Repository struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Repository { return &Repository{db: db} }

type Tx struct{ db *gorm.DB }

func (r *Repository) conn(tx Tx) *gorm.DB {
	if tx.db != nil {
		return tx.db
	}
	return r.db
}

func (r *Repository) InTransaction(ctx context.Context, fn func(tx Tx) error) error {
	return database.InTransaction(ctx, r.db, func(db *gorm.DB) error { return fn(Tx{db: db}) })
}

type Filter struct {
	TenantID uuid.UUID
	Search   string
	Status   string
	Limit    int
	Offset   int
}

func (r *Repository) scoped(ctx context.Context, tenantID uuid.UUID) *gorm.DB {
	return r.db.WithContext(ctx).Model(&model.Website{}).Where("websites.tenant_id = ?", tenantID)
}

func (r *Repository) filtered(ctx context.Context, f Filter) *gorm.DB {
	q := r.scoped(ctx, f.TenantID)
	if f.Status != "" {
		q = q.Where("websites.status = ?", f.Status)
	}
	if f.Search != "" {
		pattern := "%" + f.Search + "%"
		q = q.Where("(websites.name ILIKE ? OR websites.subdomain ILIKE ?)", pattern, pattern)
	}
	return q
}

const templateJoin = "JOIN templates tpl ON tpl.id = websites.template_id"

const templateColumns = "websites.*, tpl.slug AS template_slug, tpl.name AS template_name, tpl.thumbnail_theme AS thumbnail_theme"

func (r *Repository) List(ctx context.Context, f Filter) ([]model.WebsiteRow, error) {
	out := make([]model.WebsiteRow, 0, f.Limit)
	err := r.filtered(ctx, f).
		Joins(templateJoin).
		Select(templateColumns).
		Order("websites.created_at DESC, websites.id DESC").
		Limit(f.Limit).Offset(f.Offset).
		Find(&out).Error
	if err != nil {
		return nil, fmt.Errorf("websites: list: %w", err)
	}
	return out, nil
}

func (r *Repository) Count(ctx context.Context, f Filter) (int64, error) {
	var total int64
	if err := r.filtered(ctx, f).Count(&total).Error; err != nil {
		return 0, fmt.Errorf("websites: count: %w", err)
	}
	return total, nil
}

func (r *Repository) CountByStatus(ctx context.Context, tenantID uuid.UUID) (map[string]int64, error) {
	type row struct {
		Status string
		Total  int64
	}
	var rows []row
	err := r.scoped(ctx, tenantID).
		Select("status, count(*) AS total").
		Group("status").
		Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("websites: count by status: %w", err)
	}
	counts := make(map[string]int64, len(rows))
	for _, s := range rows {
		counts[s.Status] = s.Total
	}
	return counts, nil
}

func (r *Repository) LockTenantAndCount(ctx context.Context, tx Tx, tenantID uuid.UUID) (int64, error) {
	var locked int
	err := r.conn(tx).WithContext(ctx).
		Raw("SELECT 1 FROM tenants WHERE id = ? FOR UPDATE", tenantID).
		Scan(&locked).Error
	if err != nil {
		return 0, fmt.Errorf("websites: lock tenant: %w", err)
	}

	var total int64
	err = r.conn(tx).WithContext(ctx).
		Model(&model.Website{}).
		Where("tenant_id = ?", tenantID).
		Count(&total).Error
	if err != nil {
		return 0, fmt.Errorf("websites: count for tenant: %w", err)
	}
	return total, nil
}

func (r *Repository) Get(ctx context.Context, tenantID, id uuid.UUID) (*model.WebsiteRow, error) {
	var w model.WebsiteRow
	err := r.scoped(ctx, tenantID).
		Joins(templateJoin).
		Select(templateColumns).
		Where("websites.id = ?", id).First(&w).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("websites: get: %w", err)
	}
	return &w, nil
}

func (r *Repository) Create(ctx context.Context, tx Tx, w *model.Website) error {
	if err := r.conn(tx).WithContext(ctx).Create(w).Error; err != nil {
		return fmt.Errorf("websites: create: %w", err)
	}
	return nil
}

func (r *Repository) CreatePages(ctx context.Context, tx Tx, pages []model.Page) error {
	if len(pages) == 0 {
		return nil
	}
	if err := r.conn(tx).WithContext(ctx).Create(&pages).Error; err != nil {
		return fmt.Errorf("websites: create pages: %w", err)
	}
	return nil
}

func (r *Repository) LinkPaymentMethods(ctx context.Context, tx Tx, links []model.PaymentLink) error {
	if len(links) == 0 {
		return nil
	}
	if err := r.conn(tx).WithContext(ctx).Create(&links).Error; err != nil {
		return fmt.Errorf("websites: link payment methods: %w", err)
	}
	return nil
}

func (r *Repository) LinkDeliveryMethods(ctx context.Context, tx Tx, links []model.DeliveryLink) error {
	if len(links) == 0 {
		return nil
	}
	if err := r.conn(tx).WithContext(ctx).Create(&links).Error; err != nil {
		return fmt.Errorf("websites: link delivery methods: %w", err)
	}
	return nil
}

func (r *Repository) Update(ctx context.Context, tenantID, id uuid.UUID, fields map[string]any) error {
	res := r.scoped(ctx, tenantID).Where("websites.id = ?", id).Updates(fields)
	if res.Error != nil {
		return fmt.Errorf("websites: update: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	res := r.scoped(ctx, tenantID).Where("websites.id = ?", id).Delete(&model.Website{})
	if res.Error != nil {
		return fmt.Errorf("websites: delete: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *Repository) Pages(ctx context.Context, tenantID, websiteID uuid.UUID) ([]model.Page, error) {
	pages := make([]model.Page, 0, 16)
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND website_id = ?", tenantID, websiteID).
		Order("sort_order ASC, id ASC").
		Find(&pages).Error
	if err != nil {
		return nil, fmt.Errorf("websites: pages: %w", err)
	}
	return pages, nil
}

func (r *Repository) TemplateBySlug(ctx context.Context, tenantID uuid.UUID, slug string) (*model.TemplateSource, error) {
	var t model.TemplateSource
	err := r.db.WithContext(ctx).
		Table("templates").
		Select("id, slug, name, version, thumbnail_theme, chrome, default_theme").
		Where("slug = ? AND status = 'published'", slug).
		Where("(tenant_id IS NULL OR tenant_id = ?)", tenantID).
		First(&t).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("websites: template by slug: %w", err)
	}
	return &t, nil
}

func (r *Repository) TemplatePages(ctx context.Context, templateID uuid.UUID) ([]model.TemplatePage, error) {
	pages := make([]model.TemplatePage, 0, 16)
	err := r.db.WithContext(ctx).
		Table("template_pages").
		Select("key, path, kind, sort_order, variables").
		Where("template_id = ?", templateID).
		Order("sort_order ASC").
		Scan(&pages).Error
	if err != nil {
		return nil, fmt.Errorf("websites: template pages: %w", err)
	}
	return pages, nil
}

func (r *Repository) SubdomainTaken(ctx context.Context, subdomain string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Website{}).
		Where("subdomain = ?", subdomain).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("websites: subdomain taken: %w", err)
	}
	return count > 0, nil
}

func (r *Repository) BySubdomain(ctx context.Context, subdomain string) (*model.WebsiteRow, error) {
	var w model.WebsiteRow
	err := r.db.WithContext(ctx).Model(&model.Website{}).
		Joins(templateJoin).
		Select(templateColumns).
		Where("websites.subdomain = ?", subdomain).
		First(&w).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("websites: by subdomain: %w", err)
	}
	return &w, nil
}

func (r *Repository) SaveContent(ctx context.Context, tx Tx, tenantID, websiteID uuid.UUID, theme, chrome []byte, at time.Time) error {
	res := r.conn(tx).WithContext(ctx).Model(&model.Website{}).
		Where("id = ? AND tenant_id = ?", websiteID, tenantID).
		Updates(map[string]any{"theme": theme, "chrome": chrome, "updated_at": at})
	if res.Error != nil {
		return fmt.Errorf("websites: save content: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *Repository) SavePage(ctx context.Context, tx Tx, tenantID, websiteID uuid.UUID, key string, fields map[string]any) error {
	res := r.conn(tx).WithContext(ctx).Model(&model.Page{}).
		Where("tenant_id = ? AND website_id = ? AND key = ?", tenantID, websiteID, key).
		Updates(fields)
	if res.Error != nil {
		return fmt.Errorf("websites: save page: %w", res.Error)
	}
	return nil
}

func (r *Repository) PaymentOptions(ctx context.Context, tenantID, websiteID uuid.UUID) ([]model.PaymentOption, error) {
	out := make([]model.PaymentOption, 0, 8)
	err := r.db.WithContext(ctx).
		Table("website_payment_methods wpm").
		Select("pm.id, pm.type, pm.provider, pm.display_name, pm.fee_fixed, pm.min_order, pm.max_order, pm.test_mode").
		Joins("JOIN payment_methods pm ON pm.id = wpm.payment_method_id AND pm.tenant_id = wpm.tenant_id").
		Where("wpm.website_id = ? AND wpm.tenant_id = ? AND pm.enabled = TRUE", websiteID, tenantID).
		Order("pm.created_at ASC").
		Scan(&out).Error
	if err != nil {
		return nil, fmt.Errorf("websites: payment options: %w", err)
	}
	return out, nil
}

func (r *Repository) DeliveryOptions(ctx context.Context, tenantID, websiteID uuid.UUID) ([]model.DeliveryOption, error) {
	out := make([]model.DeliveryOption, 0, 8)
	err := r.db.WithContext(ctx).
		Table("website_delivery_methods wdm").
		Select("dm.id, dm.name, dm.partner, dm.min_days, dm.max_days, dm.rate_type, dm.price, dm.free_above").
		Joins("JOIN delivery_methods dm ON dm.id = wdm.delivery_method_id AND dm.tenant_id = wdm.tenant_id").
		Where("wdm.website_id = ? AND wdm.tenant_id = ? AND dm.enabled = TRUE", websiteID, tenantID).
		Order("dm.name ASC").
		Scan(&out).Error
	if err != nil {
		return nil, fmt.Errorf("websites: delivery options: %w", err)
	}
	return out, nil
}
