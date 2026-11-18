package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth/repository"
)

const roleTypeSuperAdmin = "super_admin"

func (s *Service) EnsurePlatformAdmin(ctx context.Context, rawEmail, password, fullName string) (bool, error) {
	email := NormalizeEmail(rawEmail)
	if email == "" || password == "" {
		return false, nil
	}

	exists, err := s.repo.UserExistsByEmail(ctx, email)
	if err != nil {
		return false, err
	}
	if exists {
		return false, nil
	}

	tenant, err := s.repo.GetTenant(ctx, model.PlatformTenantID)
	if err != nil {
		return false, err
	}
	if tenant == nil {
		return false, fmt.Errorf("auth: platform tenant %s is missing", model.PlatformTenantID)
	}

	role, err := s.repo.GetGlobalRole(ctx, roleTypeSuperAdmin)
	if err != nil {
		return false, err
	}
	if role == nil {
		return false, fmt.Errorf("auth: global super_admin role is missing")
	}

	hash, err := hashPassword(tenant.PasswordPepper, password, s.policy.BcryptCost)
	if err != nil {
		return false, err
	}

	now := s.now().UTC()
	user := &model.User{
		ID:                uuid.New(),
		TenantID:          tenant.ID,
		RoleID:            role.ID,
		RoleTenantID:      role.TenantID,
		FullName:          fullName,
		Email:             email,
		PasswordHash:      hash,
		PasswordChangedAt: now,
		IsActive:          true,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	err = s.repo.InTransaction(ctx, func(tx repository.Tx) error {
		return s.repo.CreateUser(ctx, tx, user)
	})
	if err != nil {
		if repository.IsDuplicate(err, "platform_users_email_key") {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
