package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/ryuga/ryugaware/backend/internal/modules/notification/model"
	"github.com/ryuga/ryugaware/backend/internal/platform/database"
)

type Repository struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Template(ctx context.Context, tenantID *uuid.UUID, name string) (*model.EmailTemplate, error) {
	if tenantID != nil {
		var owned model.EmailTemplate
		err := r.db.WithContext(ctx).
			Where("tenant_id = ? AND name = ?", *tenantID, name).
			First(&owned).Error
		if err == nil {
			return &owned, nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("notification: tenant template %s: %w", name, err)
		}
	}

	var platform model.EmailTemplate
	err := r.db.WithContext(ctx).
		Where("tenant_id IS NULL AND name = ?", name).
		First(&platform).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("notification: platform template %s: %w", name, err)
	}
	return &platform, nil
}

func (r *Repository) AlreadyDelivered(ctx context.Context, eventID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.EmailDelivery{}).
		Where("event_id = ? AND status = ?", eventID, model.StatusSent).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("notification: delivery lookup: %w", err)
	}
	return count > 0, nil
}

func (r *Repository) RecordDelivery(ctx context.Context, d *model.EmailDelivery) error {
	err := r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "event_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"status", "attempts", "error", "sent_at"}),
		}).
		Create(d).Error
	if err != nil {
		if database.IsUniqueViolation(err) {
			return nil
		}
		return fmt.Errorf("notification: record delivery: %w", err)
	}
	return nil
}
