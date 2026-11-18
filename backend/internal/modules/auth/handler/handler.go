package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/service"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
	"github.com/ryuga/ryugaware/backend/internal/shared/middleware"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

type CookieConfig struct {
	Domain     string
	Secure     bool
	AccessTTL  time.Duration
	RefreshTTL time.Duration
}

type Handler struct {
	svc     *service.Service
	cookies CookieConfig
}

func New(svc *service.Service, cookies CookieConfig) *Handler {
	return &Handler{svc: svc, cookies: cookies}
}

func (h *Handler) setSessionCookies(c *gin.Context, tokens service.SessionTokens) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(middleware.AccessCookieName, tokens.AccessToken, int(h.cookies.AccessTTL.Seconds()),
		"/", h.cookies.Domain, h.cookies.Secure, true)
	c.SetCookie(middleware.RefreshCookieName, tokens.RefreshToken, int(h.cookies.RefreshTTL.Seconds()),
		"/", h.cookies.Domain, h.cookies.Secure, true)
}

func (h *Handler) clearSessionCookies(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(middleware.AccessCookieName, "", -1, "/", h.cookies.Domain, h.cookies.Secure, true)
	c.SetCookie(middleware.RefreshCookieName, "", -1, "/", h.cookies.Domain, h.cookies.Secure, true)
}

func principalFrom(c *gin.Context) (*service.Principal, bool) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		return nil, false
	}
	userID, err := uuid.Parse(identity.UserID)
	if err != nil {
		return nil, false
	}
	tenantID, err := uuid.Parse(identity.TenantID)
	if err != nil {
		return nil, false
	}
	return &service.Principal{
		UserID:     userID,
		TenantID:   tenantID,
		SessionID:  identity.SessionID,
		TokenID:    identity.TokenID,
		IssuedAt:   identity.IssuedAt,
		ExpiresAt:  identity.ExpiresAt,
		Role:       identity.Role,
		Privileges: identity.Privileges,
	}, true
}

func requirePrincipal(c *gin.Context) (*service.Principal, bool) {
	principal, ok := principalFrom(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Authentication required"))
		return nil, false
	}
	return principal, true
}
