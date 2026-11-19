package service

import (
	"context"

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
