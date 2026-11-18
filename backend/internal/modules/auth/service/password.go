package service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth/repository"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth/store"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

const (
	EventPasswordResetRequested = "auth.password_reset_requested"
	EventPasswordChanged        = "auth.password_changed"
	scopeForgotPassword         = "forgot-password"
	templatePasswordReset       = "password_reset"
	templatePasswordChanged     = "password_changed"
	changedAtLayout             = "2 Jan 2006 15:04 UTC"
)

func passwordChangedEmail(user *model.User, now time.Time) Event {
	return Event{
		Type:        EventEmailRequested,
		TenantID:    &user.TenantID,
		AggregateID: &user.ID,
		Payload: map[string]any{
			"template":   templatePasswordChanged,
			"to":         user.Email,
			"name":       user.FullName,
			"changed_at": now.Format(changedAtLayout),
		},
	}
}

func (s *Service) ForgotPassword(ctx context.Context, rawEmail, clientIP string) error {
	email := NormalizeEmail(rawEmail)
	if err := validateEmail("email", email); err != nil {
		return err
	}

	allowed, err := s.cache.Allow(ctx, scopeForgotPassword, clientIP+"|"+email, s.policy.LoginRateLimit, s.policy.LoginRateWindow)
	if err != nil {
		return apperrors.Unavailable("Session store unavailable").WithCause(err)
	}
	if !allowed {
		return apperrors.RateLimited("Too many requests. Try again later.")
	}

	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return apperrors.Internal(err)
	}
	if user == nil || !user.IsActive {
		return nil
	}
	tenant, err := s.repo.GetTenant(ctx, user.TenantID)
	if err != nil {
		return apperrors.Internal(err)
	}
	if tenant == nil || !tenant.IsActive {
		return nil
	}

	token, err := s.randToken(tokenBytes)
	if err != nil {
		return apperrors.Internal(err)
	}

	if err := s.cache.SavePasswordReset(ctx, s.hashToken(token), store.ResetRecord{
		UserID:   user.ID.String(),
		TenantID: user.TenantID.String(),
	}, s.policy.PasswordResetTTL); err != nil {
		return apperrors.Unavailable("Session store unavailable").WithCause(err)
	}

	if err := s.events.Publish(ctx, Event{
		Type:        EventEmailRequested,
		TenantID:    &user.TenantID,
		AggregateID: &user.ID,
		Payload: map[string]any{
			"template":       templatePasswordReset,
			"to":             email,
			"name":           user.FullName,
			"reset_url":      s.policy.PublicBaseURL + "/reset-password?token=" + token,
			"expiry_minutes": int(s.policy.PasswordResetTTL.Minutes()),
		},
	}); err != nil {
		return apperrors.Unavailable("Could not queue the reset email").WithCause(err)
	}

	s.publish(ctx, Event{
		Type:        EventPasswordResetRequested,
		TenantID:    &user.TenantID,
		AggregateID: &user.ID,
		Payload: map[string]any{
			"user_id":   user.ID.String(),
			"tenant_id": user.TenantID.String(),
		},
	})
	return nil
}

func (s *Service) ValidateResetToken(ctx context.Context, token string) (bool, error) {
	if token == "" {
		return false, nil
	}
	record, err := s.cache.GetPasswordReset(ctx, s.hashToken(token))
	if err != nil {
		return false, apperrors.Unavailable("Session store unavailable").WithCause(err)
	}
	if record == nil {
		return false, nil
	}

	user, tenant, err := s.loadResetTarget(ctx, record)
	if err != nil {
		return false, err
	}
	return user != nil && tenant != nil, nil
}

func (s *Service) ResetPassword(ctx context.Context, token, newPassword string) error {
	if err := validatePassword("newPassword", newPassword); err != nil {
		return err
	}

	record, err := s.cache.ConsumePasswordReset(ctx, s.hashToken(token))
	if err != nil {
		return apperrors.Unavailable("Session store unavailable").WithCause(err)
	}
	if record == nil {
		return apperrors.New(apperrors.CodeBadRequest, "This password reset link is no longer valid")
	}

	user, tenant, err := s.loadResetTarget(ctx, record)
	if err != nil {
		return err
	}
	if user == nil || tenant == nil {
		return apperrors.New(apperrors.CodeBadRequest, "This password reset link is no longer valid")
	}

	hash, err := hashPassword(tenant.PasswordPepper, newPassword, s.policy.BcryptCost)
	if err != nil {
		return apperrors.Internal(err)
	}

	now := s.now().UTC()
	err = s.repo.InTransaction(ctx, func(tx repository.Tx) error {
		if err := s.repo.UpdatePassword(ctx, tx, user.TenantID, user.ID, hash, now); err != nil {
			return err
		}
		if err := s.repo.AppendOutbox(ctx, tx, buildOutboxEvent(Event{
			Type:        EventPasswordChanged,
			TenantID:    &user.TenantID,
			AggregateID: &user.ID,
			Payload: map[string]any{
				"user_id":   user.ID.String(),
				"tenant_id": user.TenantID.String(),
				"reason":    "reset",
			},
		}, now)); err != nil {
			return err
		}
		return s.repo.AppendOutbox(ctx, tx, buildOutboxEvent(passwordChangedEmail(user, now), now))
	})
	if err != nil {
		return apperrors.Internal(err)
	}

	if err := s.cache.RevokeUserSessions(ctx, user.ID.String()); err != nil {
		return apperrors.Unavailable("Session store unavailable").WithCause(err)
	}
	return nil
}

func (s *Service) ChangePassword(ctx context.Context, principal *Principal, currentPassword, newPassword string) error {
	if err := validatePassword("newPassword", newPassword); err != nil {
		return err
	}

	user, err := s.repo.GetUser(ctx, principal.TenantID, principal.UserID)
	if err != nil {
		return apperrors.Internal(err)
	}
	if user == nil || !user.IsActive {
		return apperrors.Unauthorized(sessionRevokedError)
	}
	tenant, err := s.repo.GetTenant(ctx, principal.TenantID)
	if err != nil {
		return apperrors.Internal(err)
	}
	if tenant == nil || !tenant.IsActive {
		return apperrors.Forbidden("This account is not active")
	}

	if !verifyPassword(tenant.PasswordPepper, currentPassword, user.PasswordHash) {
		return apperrors.Unauthorized("Your current password is incorrect")
	}
	if verifyPassword(tenant.PasswordPepper, newPassword, user.PasswordHash) {
		return fieldError("newPassword", "Choose a password you have not used before.")
	}

	hash, err := hashPassword(tenant.PasswordPepper, newPassword, s.policy.BcryptCost)
	if err != nil {
		return apperrors.Internal(err)
	}

	now := s.now().UTC()
	err = s.repo.InTransaction(ctx, func(tx repository.Tx) error {
		if err := s.repo.UpdatePassword(ctx, tx, user.TenantID, user.ID, hash, now); err != nil {
			return err
		}
		if err := s.repo.AppendOutbox(ctx, tx, buildOutboxEvent(Event{
			Type:        EventPasswordChanged,
			TenantID:    &user.TenantID,
			AggregateID: &user.ID,
			Payload: map[string]any{
				"user_id":   user.ID.String(),
				"tenant_id": user.TenantID.String(),
				"reason":    "change",
			},
		}, now)); err != nil {
			return err
		}
		return s.repo.AppendOutbox(ctx, tx, buildOutboxEvent(passwordChangedEmail(user, now), now))
	})
	if err != nil {
		return apperrors.Internal(err)
	}

	if err := s.cache.RevokeUserSessions(ctx, user.ID.String()); err != nil {
		return apperrors.Unavailable("Session store unavailable").WithCause(err)
	}
	return nil
}

func (s *Service) loadResetTarget(ctx context.Context, record *store.ResetRecord) (*model.User, *model.Tenant, error) {
	userID, err := uuid.Parse(record.UserID)
	if err != nil {
		return nil, nil, nil
	}
	tenantID, err := uuid.Parse(record.TenantID)
	if err != nil {
		return nil, nil, nil
	}

	user, err := s.repo.GetUser(ctx, tenantID, userID)
	if err != nil {
		return nil, nil, apperrors.Internal(err)
	}
	if user == nil || !user.IsActive {
		return nil, nil, nil
	}
	tenant, err := s.repo.GetTenant(ctx, tenantID)
	if err != nil {
		return nil, nil, apperrors.Internal(err)
	}
	if tenant == nil || !tenant.IsActive {
		return nil, nil, nil
	}
	return user, tenant, nil
}
