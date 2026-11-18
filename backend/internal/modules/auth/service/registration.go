package service

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth/repository"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth/store"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

const (
	EventUserRegistered = "auth.user_registered"
	roleTypeAdmin       = "admin"
	templateWelcome     = "welcome"
)

type RegisterInput struct {
	OrgName           string
	FullName          string
	Email             string
	Password          string
	RegistrationToken string
}

type RegisterResult struct {
	Email   string
	OrgName string
}

func (s *Service) Register(ctx context.Context, in RegisterInput) (*RegisterResult, error) {
	email := NormalizeEmail(in.Email)
	orgName := NormalizeOrgName(in.OrgName)
	fullName := NormalizeOrgName(in.FullName)

	if orgName == "" || len(orgName) > maxNameLength {
		return nil, fieldError("orgName", "Enter an organization name of 80 characters or fewer.")
	}
	if fullName == "" || len(fullName) > maxNameLength {
		return nil, fieldError("fullName", "Enter a name of 80 characters or fewer.")
	}
	if err := validateEmail("email", email); err != nil {
		return nil, err
	}
	if err := validatePassword("password", in.Password); err != nil {
		return nil, err
	}

	outcome, err := s.cache.ConsumeRegistrationProof(ctx, email, s.hashToken(in.RegistrationToken))
	if err != nil {
		return nil, apperrors.Unavailable("Verification store unavailable").WithCause(err)
	}
	switch outcome {
	case store.ProofMissing:
		return nil, apperrors.VerificationRequired()
	case store.ProofMismatch:
		return nil, apperrors.InvalidRegistrationToken()
	}

	exists, err := s.repo.UserExistsByEmail(ctx, email)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if exists {
		return nil, apperrors.EmailAlreadyRegistered()
	}

	taken, err := s.repo.TenantExistsByName(ctx, orgName)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if taken {
		return nil, apperrors.OrganizationNameTaken()
	}

	adminRole, err := s.repo.GetGlobalRole(ctx, roleTypeAdmin)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if adminRole == nil {
		return nil, apperrors.Internal(errMissingAdminRole)
	}

	pepper, err := randomPepper()
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	passwordHash, err := hashPassword(pepper, in.Password, s.policy.BcryptCost)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	now := s.now().UTC()
	tenant := &model.Tenant{
		ID:             uuid.New(),
		Name:           orgName,
		PasswordPepper: pepper,
		JWTSecret:      mustToken(s.randToken),
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	user := &model.User{
		ID:                uuid.New(),
		TenantID:          tenant.ID,
		RoleID:            adminRole.ID,
		RoleTenantID:      adminRole.TenantID,
		FullName:          fullName,
		Email:             email,
		PasswordHash:      passwordHash,
		PasswordChangedAt: now,
		IsActive:          true,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	license := &model.License{
		ID:                uuid.New(),
		TenantID:          tenant.ID,
		Plan:              "default",
		MaxWebsites:       1,
		StorageLimitBytes: 10 * 1024 * 1024 * 1024,
		StartsAt:          now,
		ExpiresAt:         now.AddDate(1, 0, 0),
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	err = s.repo.InTransaction(ctx, func(tx repository.Tx) error {
		if err := s.repo.CreateTenant(ctx, tx, tenant); err != nil {
			return err
		}
		if err := s.repo.CreateUser(ctx, tx, user); err != nil {
			return err
		}
		if err := s.repo.CreateLicense(ctx, tx, license); err != nil {
			return err
		}
		if err := s.repo.AppendOutbox(ctx, tx, buildOutboxEvent(Event{
			Type:        EventUserRegistered,
			TenantID:    &tenant.ID,
			AggregateID: &user.ID,
			Payload: map[string]any{
				"user_id":   user.ID.String(),
				"tenant_id": tenant.ID.String(),
				"email":     email,
				"org_name":  orgName,
				"full_name": fullName,
			},
		}, now)); err != nil {
			return err
		}
		return s.repo.AppendOutbox(ctx, tx, buildOutboxEvent(Event{
			Type:        EventEmailRequested,
			TenantID:    &tenant.ID,
			AggregateID: &user.ID,
			Payload: map[string]any{
				"template":          templateWelcome,
				"to":                email,
				"name":              fullName,
				"organization_name": orgName,
				"login_url":         s.policy.PublicBaseURL + "/login",
			},
		}, now))
	})
	if err != nil {
		if repository.IsDuplicate(err, "platform_users_email_key") {
			return nil, apperrors.EmailAlreadyRegistered()
		}
		if repository.IsDuplicate(err, "tenants_name_key") {
			return nil, apperrors.OrganizationNameTaken()
		}
		return nil, apperrors.Internal(err)
	}

	return &RegisterResult{Email: email, OrgName: orgName}, nil
}

func mustToken(gen func(int) (string, error)) string {
	token, err := gen(tokenBytes)
	if err != nil {
		return uuid.NewString()
	}
	return token
}

var errMissingAdminRole = errors.New("auth: global admin role is missing from the database")
