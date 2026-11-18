package service

import (
	"context"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/store"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

const (
	EventEmailRequested = "notification.email_requested"
	templateOTP         = "email_verification"
)

func (s *Service) RequestOTP(ctx context.Context, rawEmail string) error {
	email := NormalizeEmail(rawEmail)
	if err := s.guardVerificationTarget(ctx, email); err != nil {
		return err
	}

	cooling, err := s.cache.OnResendCooldown(ctx, email)
	if err != nil {
		return apperrors.Unavailable("Verification store unavailable").WithCause(err)
	}
	if cooling {
		return nil
	}
	return s.issueOTP(ctx, email)
}

func (s *Service) ResendOTP(ctx context.Context, rawEmail string) error {
	return s.RequestOTP(ctx, rawEmail)
}

func (s *Service) VerifyOTP(ctx context.Context, rawEmail, otp string) (string, error) {
	email := NormalizeEmail(rawEmail)
	if err := s.guardVerificationTarget(ctx, email); err != nil {
		return "", err
	}

	proof, err := s.randToken(tokenBytes)
	if err != nil {
		return "", apperrors.Internal(err)
	}

	outcome, err := s.cache.VerifyOTP(ctx, email, s.hashToken(otp), s.hashToken(proof))
	if err != nil {
		return "", apperrors.Unavailable("Verification store unavailable").WithCause(err)
	}

	switch outcome {
	case store.OTPVerified:
		return proof, nil
	case store.OTPWrong:
		return "", apperrors.InvalidOTP()
	case store.OTPLockedOut:
		return "", apperrors.RateLimited("Too many incorrect codes. Try again later.")
	default:
		return "", apperrors.OTPExpired()
	}
}

func (s *Service) guardVerificationTarget(ctx context.Context, email string) error {
	if err := validateEmail("email", email); err != nil {
		return err
	}

	blacklisted, err := s.cache.IsBlacklisted(ctx, email)
	if err != nil {
		return apperrors.Unavailable("Verification store unavailable").WithCause(err)
	}
	if blacklisted {
		return apperrors.RateLimited("Too many attempts. Try again later.")
	}

	exists, err := s.repo.UserExistsByEmail(ctx, email)
	if err != nil {
		return apperrors.Internal(err)
	}
	if exists {
		return apperrors.EmailAlreadyRegistered()
	}
	return nil
}

func (s *Service) issueOTP(ctx context.Context, email string) error {
	otp, err := s.randOTP()
	if err != nil {
		return apperrors.Internal(err)
	}

	if err := s.cache.SaveOTP(ctx, email, s.hashToken(otp)); err != nil {
		return apperrors.Unavailable("Verification store unavailable").WithCause(err)
	}

	evt := Event{
		Type: EventEmailRequested,
		Payload: map[string]any{
			"template":       templateOTP,
			"to":             email,
			"name":           "there",
			"otp":            otp,
			"expiry_minutes": int(s.policy.OTPTTL.Minutes()),
		},
	}
	if err := s.events.Publish(ctx, evt); err != nil {
		return apperrors.Unavailable("Could not queue the verification email").WithCause(err)
	}
	return nil
}
