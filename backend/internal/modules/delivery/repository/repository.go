package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/ryuga/ryugaware/backend/internal/modules/delivery/model"
)

type Repository struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Repository { return &Repository{db: db} }

type Filter struct {
	TenantID uuid.UUID
	Search   string
	Status   string
	Limit    int
	Offset   int
}

func (r *Repository) scoped(ctx context.Context, tenantID uuid.UUID) *gorm.DB {
	return r.db.WithContext(ctx).Model(&model.Method{}).Where("tenant_id = ?", tenantID)
}

func (r *Repository) filtered(ctx context.Context, f Filter) *gorm.DB {
	q := r.scoped(ctx, f.TenantID)
	switch f.Status {
	case "enabled":
		q = q.Where("enabled = TRUE")
	case "disabled":
		q = q.Where("enabled = FALSE")
	}
	if f.Search != "" {
		q = q.Where("name ILIKE ?", "%"+f.Search+"%")
	}
	return q
}

func (r *Repository) List(ctx context.Context, f Filter) ([]model.Method, error) {
	out := make([]model.Method, 0, f.Limit)
	err := r.filtered(ctx, f).
		Order("name ASC, id ASC").
		Limit(f.Limit).
		Offset(f.Offset).
		Find(&out).Error
	if err != nil {
		return nil, fmt.Errorf("delivery: list methods: %w", err)
	}
	return out, nil
}

func (r *Repository) Count(ctx context.Context, f Filter) (int64, error) {
	var total int64
	if err := r.filtered(ctx, f).Count(&total).Error; err != nil {
		return 0, fmt.Errorf("delivery: count methods: %w", err)
	}
	return total, nil
}

func (r *Repository) CountEnabled(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	var total int64
	if err := r.scoped(ctx, tenantID).Where("enabled = TRUE").Count(&total).Error; err != nil {
		return 0, fmt.Errorf("delivery: count enabled methods: %w", err)
	}
	return total, nil
}

func (r *Repository) Get(ctx context.Context, tenantID, id uuid.UUID) (*model.Method, error) {
	var m model.Method
	err := r.scoped(ctx, tenantID).Where("id = ?", id).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("delivery: get method: %w", err)
	}
	return &m, nil
}

func (r *Repository) Create(ctx context.Context, m *model.Method) error {
	if err := r.db.WithContext(ctx).Create(m).Error; err != nil {
		return fmt.Errorf("delivery: create method: %w", err)
	}
	return nil
}

func (r *Repository) Update(ctx context.Context, tenantID, id uuid.UUID, fields map[string]any) error {
	res := r.scoped(ctx, tenantID).Where("id = ?", id).Updates(fields)
	if res.Error != nil {
		return fmt.Errorf("delivery: update method: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	res := r.scoped(ctx, tenantID).Where("id = ?", id).Delete(&model.Method{})
	if res.Error != nil {
		return fmt.Errorf("delivery: delete method: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *Repository) EnabledIDs(ctx context.Context, tenantID uuid.UUID) ([]uuid.UUID, error) {
	ids := make([]uuid.UUID, 0, 8)
	err := r.scoped(ctx, tenantID).
		Where("enabled = TRUE").
		Order("created_at ASC, id ASC").
		Pluck("id", &ids).Error
	if err != nil {
		return nil, fmt.Errorf("enabled method ids: %w", err)
	}
	return ids, nil
}
