package service

import (
	"context"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/model"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

const (
	LicenseStatusActive  = "active"
	LicenseStatusExpired = "expired"
)

type TenantLicense struct {
	License      *model.License
	Status       string
	Used         int
	Remaining    int
	LimitReached bool
}

func (s *Service) TenantLicense(ctx context.Context, principal *Principal) (*TenantLicense, error) {
	license, err := s.repo.GetLicense(ctx, principal.TenantID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if license == nil {
		return nil, apperrors.NotFound("license")
	}

	status := LicenseStatusActive
	if !license.ExpiresAt.After(s.now()) {
		status = LicenseStatusExpired
	}

	used := 0
	if s.websites != nil {
		count, err := s.websites.CountForTenant(ctx, principal.TenantID)
		if err != nil {
			return nil, apperrors.Internal(err)
		}
		used = int(count)
	}
	remaining := license.MaxWebsites - used
	if remaining < 0 {
		remaining = 0
	}

	return &TenantLicense{
		License:      license,
		Status:       status,
		Used:         used,
		Remaining:    remaining,
		LimitReached: used >= license.MaxWebsites,
	}, nil
}

func (s *Service) WebsiteAllowance(ctx context.Context, tenantID uuid.UUID) (int, error) {
	license, err := s.repo.GetLicense(ctx, tenantID)
	if err != nil {
		return 0, apperrors.Internal(err)
	}
	if license == nil {
		return 0, apperrors.Forbidden("This organization has no licence")
	}
	if !license.ExpiresAt.After(s.now()) {
		return 0, apperrors.Forbidden("Your licence has expired")
	}
	return license.MaxWebsites, nil
}

func (s *Service) StorageLimitBytes(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	license, err := s.repo.GetLicense(ctx, tenantID)
	if err != nil {
		return 0, apperrors.Internal(err)
	}
	if license == nil {
		return 0, apperrors.Forbidden("This organization has no licence")
	}
	return license.StorageLimitBytes, nil
}
