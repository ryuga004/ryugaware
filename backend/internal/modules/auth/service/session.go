package service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth/store"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

const (
	EventUserLoggedIn   = "auth.user_logged_in"
	EventLoginFailed    = "auth.user_login_failed"
	EventUserLoggedOut  = "auth.user_logged_out"
	scopeLogin          = "login"
	genericCredentials  = "Wrong email or password"
	sessionRevokedError = "Session expired or invalid"
)

type SessionTokens struct {
	AccessToken     string
	AccessExpiresAt time.Time
	RefreshToken    string
	SessionID       string
}

type LoginResult struct {
	Tokens   SessionTokens
	User     *model.User
	Tenant   *model.Tenant
	Username string
}

func (s *Service) Login(ctx context.Context, rawEmail, password, clientIP string) (*LoginResult, error) {
	email := NormalizeEmail(rawEmail)
	if err := validateEmail("email", email); err != nil {
		return nil, err
	}

	allowed, err := s.cache.Allow(ctx, scopeLogin, clientIP+"|"+email, s.policy.LoginRateLimit, s.policy.LoginRateWindow)
	if err != nil {
		return nil, apperrors.Unavailable("Session store unavailable").WithCause(err)
	}
	if !allowed {
		return nil, apperrors.RateLimited("Too many sign-in attempts. Try again later.")
	}

	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if user == nil {
		s.burnPasswordTime(password)
		s.publishLoginFailed(ctx, email, "unknown_user")
		return nil, apperrors.Unauthorized(genericCredentials)
	}

	tenant, err := s.repo.GetTenant(ctx, user.TenantID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if tenant == nil {
		return nil, apperrors.Unauthorized(genericCredentials)
	}
	if !user.IsActive || !tenant.IsActive {
		s.publishLoginFailed(ctx, email, "inactive")
		return nil, apperrors.Forbidden("This account is not active")
	}

	if !verifyPassword(tenant.PasswordPepper, password, user.PasswordHash) {
		s.publishLoginFailed(ctx, email, "bad_password")
		return nil, apperrors.Unauthorized(genericCredentials)
	}

	tokens, err := s.startSession(ctx, user, tenant)
	if err != nil {
		return nil, err
	}

	now := s.now().UTC()
	if err := s.repo.TouchLastLogin(ctx, user.TenantID, user.ID, now); err != nil {
		return nil, apperrors.Internal(err)
	}
	if err := s.cache.ResetAttempts(ctx, scopeLogin, clientIP+"|"+email); err != nil {
		return nil, apperrors.Unavailable("Session store unavailable").WithCause(err)
	}

	s.publish(ctx, Event{
		Type:        EventUserLoggedIn,
		TenantID:    &user.TenantID,
		AggregateID: &user.ID,
		Payload: map[string]any{
			"user_id":    user.ID.String(),
			"tenant_id":  user.TenantID.String(),
			"session_id": tokens.SessionID,
		},
	})

	return &LoginResult{Tokens: *tokens, User: user, Tenant: tenant}, nil
}

func (s *Service) startSession(ctx context.Context, user *model.User, tenant *model.Tenant) (*SessionTokens, error) {
	if err := s.cache.EnforceSessionLimit(ctx, user.ID.String(), s.policy.MaxActiveSessions); err != nil {
		return nil, apperrors.Unavailable("Session store unavailable").WithCause(err)
	}

	sessionID, err := s.randToken(sessionIDBytes)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	secret, err := s.randToken(tokenBytes)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	now := s.now().UTC()
	if err := s.cache.SaveSession(ctx, store.Session{
		SessionID:   sessionID,
		UserID:      user.ID.String(),
		TenantID:    user.TenantID.String(),
		RefreshHash: s.hashToken(secret),
		CreatedAt:   now,
	}); err != nil {
		return nil, apperrors.Unavailable("Session store unavailable").WithCause(err)
	}

	access, _, expires, err := s.issueAccessToken(user.ID, user.TenantID, tenant.JWTSecret, sessionID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	return &SessionTokens{
		AccessToken:     access,
		AccessExpiresAt: expires,
		RefreshToken:    newRefreshToken(sessionID, secret),
		SessionID:       sessionID,
	}, nil
}

func (s *Service) Refresh(ctx context.Context, refreshToken string) (*SessionTokens, error) {
	sessionID, secret, ok := splitRefreshToken(refreshToken)
	if !ok {
		return nil, apperrors.Unauthorized(sessionRevokedError)
	}

	session, err := s.cache.GetSession(ctx, sessionID)
	if err != nil {
		return nil, apperrors.Unavailable("Session store unavailable").WithCause(err)
	}
	if session == nil {
		return nil, apperrors.Unauthorized(sessionRevokedError)
	}

	userID, err := uuid.Parse(session.UserID)
	if err != nil {
		return nil, apperrors.Unauthorized(sessionRevokedError)
	}
	tenantID, err := uuid.Parse(session.TenantID)
	if err != nil {
		return nil, apperrors.Unauthorized(sessionRevokedError)
	}

	user, err := s.repo.GetUser(ctx, tenantID, userID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if user == nil || !user.IsActive {
		return nil, apperrors.Unauthorized(sessionRevokedError)
	}
	tenant, err := s.repo.GetTenant(ctx, tenantID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if tenant == nil || !tenant.IsActive {
		return nil, apperrors.Forbidden("This account is not active")
	}

	newSecret, err := s.randToken(tokenBytes)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	outcome, err := s.cache.RotateSession(ctx, sessionID, s.hashToken(secret), s.hashToken(newSecret))
	if err != nil {
		return nil, apperrors.Unavailable("Session store unavailable").WithCause(err)
	}
	switch outcome {
	case store.RotateReuseDetected:
		if err := s.cache.RevokeUserSessions(ctx, session.UserID); err != nil {
			return nil, apperrors.Unavailable("Session store unavailable").WithCause(err)
		}
		return nil, apperrors.Unauthorized(sessionRevokedError)
	case store.RotateMissing:
		return nil, apperrors.Unauthorized(sessionRevokedError)
	}

	access, _, expires, err := s.issueAccessToken(user.ID, user.TenantID, tenant.JWTSecret, sessionID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	return &SessionTokens{
		AccessToken:     access,
		AccessExpiresAt: expires,
		RefreshToken:    newRefreshToken(sessionID, newSecret),
		SessionID:       sessionID,
	}, nil
}

func (s *Service) Logout(ctx context.Context, principal *Principal, refreshToken string) error {
	sessionID := ""
	userID := ""
	if principal != nil {
		sessionID = principal.SessionID
		userID = principal.UserID.String()
	}
	if sessionID == "" {
		if id, _, ok := splitRefreshToken(refreshToken); ok {
			sessionID = id
		}
	}
	if sessionID == "" {
		return nil
	}

	if userID == "" {
		if session, err := s.cache.GetSession(ctx, sessionID); err == nil && session != nil {
			userID = session.UserID
		}
	}

	if err := s.cache.DeleteSession(ctx, userID, sessionID); err != nil {
		return apperrors.Unavailable("Session store unavailable").WithCause(err)
	}

	if principal != nil && principal.TokenID != "" {
		ttl := time.Until(principal.ExpiresAt)
		if err := s.cache.DenylistAccessToken(ctx, principal.TokenID, ttl); err != nil {
			return apperrors.Unavailable("Session store unavailable").WithCause(err)
		}
		s.publish(ctx, Event{
			Type:        EventUserLoggedOut,
			TenantID:    &principal.TenantID,
			AggregateID: &principal.UserID,
			Payload: map[string]any{
				"user_id":    principal.UserID.String(),
				"tenant_id":  principal.TenantID.String(),
				"session_id": sessionID,
			},
		})
	}
	return nil
}

type CurrentUser struct {
	User       *model.User
	Tenant     *model.Tenant
	Role       string
	Privileges []string
}

func (s *Service) CurrentUser(ctx context.Context, principal *Principal) (*CurrentUser, error) {
	user, err := s.repo.GetUser(ctx, principal.TenantID, principal.UserID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if user == nil || !user.IsActive {
		return nil, apperrors.Unauthorized(sessionRevokedError)
	}
	tenant, err := s.repo.GetTenant(ctx, principal.TenantID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if tenant == nil || !tenant.IsActive {
		return nil, apperrors.Forbidden("This account is not active")
	}
	return &CurrentUser{
		User:       user,
		Tenant:     tenant,
		Role:       principal.Role,
		Privileges: principal.Privileges,
	}, nil
}

func (s *Service) publish(ctx context.Context, evt Event) {
	_ = s.events.Publish(ctx, evt)
}

func (s *Service) publishLoginFailed(ctx context.Context, email, reason string) {
	s.publish(ctx, Event{
		Type: EventLoginFailed,
		Payload: map[string]any{
			"email":  email,
			"reason": reason,
		},
	})
}
