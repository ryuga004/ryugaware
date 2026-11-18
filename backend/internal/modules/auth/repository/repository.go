package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/model"
	"github.com/ryuga/ryugaware/backend/internal/platform/database"
)

type Tx struct {
	db *gorm.DB
}

type Repository struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) conn(tx Tx) *gorm.DB {
	if tx.db != nil {
		return tx.db
	}
	return r.db
}

func (r *Repository) TenantExistsByName(ctx context.Context, name string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Tenant{}).Where("name = ?", name).Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("auth: tenant exists by name: %w", err)
	}
	return count > 0, nil
}

func (r *Repository) CreateTenant(ctx context.Context, tx Tx, t *model.Tenant) error {
	if err := r.conn(tx).WithContext(ctx).Create(t).Error; err != nil {
		return fmt.Errorf("auth: create tenant: %w", err)
	}
	return nil
}

func (r *Repository) GetTenant(ctx context.Context, id uuid.UUID) (*model.Tenant, error) {
	var t model.Tenant
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&t).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("auth: get tenant: %w", err)
	}
	return &t, nil
}

func (r *Repository) UserExistsByEmail(ctx context.Context, email string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.User{}).Where("email = ?", email).Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("auth: user exists by email: %w", err)
	}
	return count > 0, nil
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	var u model.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("auth: get user by email: %w", err)
	}
	return &u, nil
}

func (r *Repository) GetUser(ctx context.Context, tenantID, id uuid.UUID) (*model.User, error) {
	var u model.User
	err := r.db.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, tenantID).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("auth: get user: %w", err)
	}
	return &u, nil
}

func (r *Repository) CreateUser(ctx context.Context, tx Tx, u *model.User) error {
	err := r.conn(tx).WithContext(ctx).Create(u).Error
	if err != nil {
		return fmt.Errorf("auth: create user: %w", err)
	}
	return nil
}

func (r *Repository) TouchLastLogin(ctx context.Context, tenantID, id uuid.UUID, at time.Time) error {
	err := r.db.WithContext(ctx).Model(&model.User{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Updates(map[string]any{"last_login_at": at, "updated_at": at}).Error
	if err != nil {
		return fmt.Errorf("auth: touch last login: %w", err)
	}
	return nil
}

func (r *Repository) UpdatePassword(ctx context.Context, tx Tx, tenantID, id uuid.UUID, hash string, at time.Time) error {
	res := r.conn(tx).WithContext(ctx).Model(&model.User{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Updates(map[string]any{"password_hash": hash, "password_changed_at": at, "updated_at": at})
	if res.Error != nil {
		return fmt.Errorf("auth: update password: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *Repository) GetGlobalRole(ctx context.Context, roleType string) (*model.Role, error) {
	var role model.Role
	err := r.db.WithContext(ctx).Where("tenant_id IS NULL AND type = ?", roleType).First(&role).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("auth: get global role: %w", err)
	}
	return &role, nil
}

func (r *Repository) GetRole(ctx context.Context, id uuid.UUID) (*model.Role, error) {
	var role model.Role
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&role).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("auth: get role: %w", err)
	}
	return &role, nil
}

func (r *Repository) PrivilegeNames(ctx context.Context, roleID uuid.UUID) ([]string, error) {
	names := make([]string, 0, 24)
	err := r.db.WithContext(ctx).
		Table("role_privileges").
		Select("privileges.name").
		Joins("JOIN privileges ON privileges.id = role_privileges.privilege_id").
		Where("role_privileges.role_id = ?", roleID).
		Order("privileges.name").
		Pluck("privileges.name", &names).Error
	if err != nil {
		return nil, fmt.Errorf("auth: privilege names: %w", err)
	}
	return names, nil
}

func (r *Repository) CreateLicense(ctx context.Context, tx Tx, l *model.License) error {
	if err := r.conn(tx).WithContext(ctx).Create(l).Error; err != nil {
		return fmt.Errorf("auth: create license: %w", err)
	}
	return nil
}

func (r *Repository) AppendOutbox(ctx context.Context, tx Tx, e *model.OutboxEvent) error {
	if err := r.conn(tx).WithContext(ctx).Create(e).Error; err != nil {
		return fmt.Errorf("auth: append outbox: %w", err)
	}
	return nil
}

func (r *Repository) InTransaction(ctx context.Context, fn func(tx Tx) error) error {
	return database.InTransaction(ctx, r.db, func(tx *gorm.DB) error {
		return fn(Tx{db: tx})
	})
}

func IsDuplicate(err error, constraint string) bool {
	return database.IsUniqueViolation(err) && database.ConstraintName(err) == constraint
}
