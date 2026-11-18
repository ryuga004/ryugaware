package service

import (
	"context"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

const dashboardAudience = "ryugaware-dashboard"

type Claims struct {
	jwt.RegisteredClaims
	TenantID  string `json:"tenant_id"`
	SessionID string `json:"sid"`
}

type Principal struct {
	UserID     uuid.UUID
	TenantID   uuid.UUID
	SessionID  string
	TokenID    string
	IssuedAt   time.Time
	ExpiresAt  time.Time
	Role       string
	Privileges []string
}

func (p Principal) Has(privilege string) bool {
	for _, name := range p.Privileges {
		if name == privilege {
			return true
		}
	}
	return false
}

func (s *Service) issueAccessToken(userID, tenantID uuid.UUID, tenantSecret, sessionID string) (string, string, time.Time, error) {
	issued := s.now().UTC()
	expires := issued.Add(s.policy.AccessTokenTTL)
	jti := uuid.NewString()

	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			Issuer:    s.policy.JWTIssuer,
			Audience:  jwt.ClaimStrings{dashboardAudience},
			ID:        jti,
			IssuedAt:  jwt.NewNumericDate(issued),
			NotBefore: jwt.NewNumericDate(issued),
			ExpiresAt: jwt.NewNumericDate(expires),
		},
		TenantID:  tenantID.String(),
		SessionID: sessionID,
	}

	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(deriveDashboardKey(tenantSecret))
	if err != nil {
		return "", "", time.Time{}, fmt.Errorf("auth: sign access token: %w", err)
	}
	return signed, jti, expires, nil
}

func unverifiedTenantID(token string) (uuid.UUID, error) {
	claims := &Claims{}
	if _, _, err := jwt.NewParser().ParseUnverified(token, claims); err != nil {
		return uuid.Nil, apperrors.Unauthorized(sessionRevokedError)
	}
	tenantID, err := uuid.Parse(claims.TenantID)
	if err != nil {
		return uuid.Nil, apperrors.Unauthorized(sessionRevokedError)
	}
	return tenantID, nil
}

func (s *Service) dashboardKeyFor(ctx context.Context, tenantID uuid.UUID) ([]byte, error) {
	id := tenantID.String()

	cached, found, err := s.cache.GetTenantSigningKey(ctx, id)
	if err != nil {
		return nil, apperrors.Unavailable("Session store unavailable").WithCause(err)
	}
	if found {
		if cached == "" {
			return nil, apperrors.Unauthorized(sessionRevokedError)
		}
		key, err := hex.DecodeString(cached)
		if err == nil {
			return key, nil
		}
	}

	tenant, err := s.repo.GetTenant(ctx, tenantID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if tenant == nil || !tenant.IsActive || tenant.JWTSecret == "" {
		if err := s.cache.SetTenantSigningKey(ctx, id, "", s.policy.TenantKeyCacheTTL); err != nil {
			return nil, apperrors.Unavailable("Session store unavailable").WithCause(err)
		}
		return nil, apperrors.Unauthorized(sessionRevokedError)
	}

	key := deriveDashboardKey(tenant.JWTSecret)
	if err := s.cache.SetTenantSigningKey(ctx, id, hex.EncodeToString(key), s.policy.TenantKeyCacheTTL); err != nil {
		return nil, apperrors.Unavailable("Session store unavailable").WithCause(err)
	}
	return key, nil
}

func (s *Service) parseAccessToken(ctx context.Context, token string) (*Claims, error) {
	tenantID, err := unverifiedTenantID(token)
	if err != nil {
		return nil, err
	}

	key, err := s.dashboardKeyFor(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	claims := &Claims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (any, error) {
		return key, nil
	},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(s.policy.JWTIssuer),
		jwt.WithAudience(dashboardAudience),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(s.now),
	)
	if err != nil || !parsed.Valid {
		return nil, apperrors.Unauthorized(sessionRevokedError)
	}
	if claims.TenantID != tenantID.String() {
		return nil, apperrors.Unauthorized(sessionRevokedError)
	}
	return claims, nil
}

func (s *Service) Authenticate(ctx context.Context, accessToken string) (*Principal, error) {
	claims, err := s.parseAccessToken(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	denied, err := s.cache.IsAccessTokenDenylisted(ctx, claims.ID)
	if err != nil {
		return nil, apperrors.Unavailable("Session store unavailable").WithCause(err)
	}
	if denied {
		return nil, apperrors.Unauthorized(sessionRevokedError)
	}

	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return nil, apperrors.Unauthorized(sessionRevokedError)
	}
	tenantID, err := uuid.Parse(claims.TenantID)
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

	issuedAt := claims.IssuedAt.Time.UTC()
	if user.PasswordChangedAt.UTC().Truncate(time.Second).After(issuedAt.Truncate(time.Second)) {
		return nil, apperrors.Unauthorized(sessionRevokedError)
	}

	tenant, err := s.repo.GetTenant(ctx, tenantID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if tenant == nil || !tenant.IsActive {
		return nil, apperrors.Forbidden("Organization is not active")
	}

	role, err := s.repo.GetRole(ctx, user.RoleID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	privileges, err := s.repo.PrivilegeNames(ctx, user.RoleID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	principal := &Principal{
		UserID:     user.ID,
		TenantID:   user.TenantID,
		SessionID:  claims.SessionID,
		TokenID:    claims.ID,
		IssuedAt:   issuedAt,
		ExpiresAt:  claims.ExpiresAt.Time.UTC(),
		Privileges: privileges,
	}
	if role != nil {
		principal.Role = role.Type
	}
	return principal, nil
}
