package service

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/model"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

func seedLicense(repo *fakeRepo, tenantID uuid.UUID, maxWebsites int, expiresAt time.Time) *model.License {
	license := &model.License{
		ID:                uuid.New(),
		TenantID:          tenantID,
		Plan:              "default",
		MaxWebsites:       maxWebsites,
		StorageLimitBytes: 10 * 1024 * 1024 * 1024,
		StartsAt:          fixedNow.AddDate(-1, 0, 0),
		ExpiresAt:         expiresAt,
	}
	repo.licenses = append(repo.licenses, license)
	return license
}

func TestTenantLicense_Active_ReturnsAllowanceAndRemaining(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	user, tenant := seedUser(t, svc, repo, "owner@acme.test", "correct-horse")
	seedLicense(repo, tenant.ID, 3, fixedNow.Add(24*time.Hour))

	got, err := svc.TenantLicense(t.Context(), &Principal{UserID: user.ID, TenantID: tenant.ID})
	if err != nil {
		t.Fatalf("TenantLicense: %v", err)
	}
	if got.Status != LicenseStatusActive {
		t.Errorf("status = %q, want %q", got.Status, LicenseStatusActive)
	}
	if got.License.MaxWebsites != 3 {
		t.Errorf("allowance = %d, want 3", got.License.MaxWebsites)
	}
	if got.Used != 0 || got.Remaining != 3 {
		t.Errorf("used/remaining = %d/%d, want 0/3", got.Used, got.Remaining)
	}
	if got.LimitReached {
		t.Error("limitReached = true, want false")
	}
}

func TestTenantLicense_ExpiryBoundary(t *testing.T) {
	cases := []struct {
		name      string
		expiresAt time.Time
		want      string
	}{
		{"future", fixedNow.Add(time.Second), LicenseStatusActive},
		{"exactly now", fixedNow, LicenseStatusExpired},
		{"past", fixedNow.Add(-time.Second), LicenseStatusExpired},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			svc, repo, _, _ := newTestService(t)
			user, tenant := seedUser(t, svc, repo, "owner@acme.test", "correct-horse")
			seedLicense(repo, tenant.ID, 1, tc.expiresAt)

			got, err := svc.TenantLicense(t.Context(), &Principal{UserID: user.ID, TenantID: tenant.ID})
			if err != nil {
				t.Fatalf("TenantLicense: %v", err)
			}
			if got.Status != tc.want {
				t.Errorf("status = %q, want %q", got.Status, tc.want)
			}
		})
	}
}

func TestTenantLicense_ZeroAllowance_LimitReached(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	user, tenant := seedUser(t, svc, repo, "owner@acme.test", "correct-horse")
	seedLicense(repo, tenant.ID, 0, fixedNow.Add(24*time.Hour))

	got, err := svc.TenantLicense(t.Context(), &Principal{UserID: user.ID, TenantID: tenant.ID})
	if err != nil {
		t.Fatalf("TenantLicense: %v", err)
	}
	if !got.LimitReached {
		t.Error("limitReached = false, want true for a zero allowance")
	}
	if got.Remaining != 0 {
		t.Errorf("remaining = %d, want 0", got.Remaining)
	}
}

func TestTenantLicense_OtherTenantsLicense_NotFound(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	user, tenant := seedUser(t, svc, repo, "owner@acme.test", "correct-horse")
	other := uuid.New()
	seedLicense(repo, other, 99, fixedNow.Add(24*time.Hour))

	_, err := svc.TenantLicense(t.Context(), &Principal{UserID: user.ID, TenantID: tenant.ID})
	if !apperrors.IsCode(err, apperrors.CodeNotFound) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeNotFound)
	}

	got, err := svc.TenantLicense(t.Context(), &Principal{UserID: user.ID, TenantID: other})
	if err != nil {
		t.Fatalf("owning tenant: %v", err)
	}
	if got.License.MaxWebsites != 99 {
		t.Errorf("allowance = %d, want 99", got.License.MaxWebsites)
	}
}

func TestTenantLicense_Missing_NotFound(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	user, tenant := seedUser(t, svc, repo, "owner@acme.test", "correct-horse")

	_, err := svc.TenantLicense(t.Context(), &Principal{UserID: user.ID, TenantID: tenant.ID})
	if !apperrors.IsCode(err, apperrors.CodeNotFound) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeNotFound)
	}
}
