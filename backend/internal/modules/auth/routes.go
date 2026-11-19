package auth

import (
	"context"

	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/handler"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth/service"
	"github.com/ryuga/ryugaware/backend/internal/shared/middleware"
)

type Authenticator struct {
	svc *service.Service
}

func NewAuthenticator(svc *service.Service) Authenticator {
	return Authenticator{svc: svc}
}

func (a Authenticator) Authenticate(ctx context.Context, accessToken string) (*middleware.Identity, error) {
	principal, err := a.svc.Authenticate(ctx, accessToken)
	if err != nil {
		return nil, err
	}
	return &middleware.Identity{
		UserID:     principal.UserID.String(),
		TenantID:   principal.TenantID.String(),
		SessionID:  principal.SessionID,
		TokenID:    principal.TokenID,
		Role:       principal.Role,
		Privileges: principal.Privileges,
		IssuedAt:   principal.IssuedAt,
		ExpiresAt:  principal.ExpiresAt,
	}, nil
}

func RegisterRoutes(group *gin.RouterGroup, h *handler.Handler, auth middleware.Authenticator) {
	g := group.Group("/auth")

	g.POST("/email-verification/otp", h.RequestOTP)
	g.POST("/email-verification/verify", h.VerifyOTP)
	g.POST("/email-verification/resend", h.ResendOTP)
	g.POST("/register", h.Register)
	g.POST("/sessions", h.Login)
	g.POST("/tokens/refresh", h.Refresh)
	g.POST("/password/forgot", h.ForgotPassword)
	g.GET("/password/reset/validate", h.ValidateResetToken)
	g.POST("/password/reset", h.ResetPassword)

	optional := middleware.Authenticate(auth, false)
	required := middleware.Authenticate(auth, true)

	group.GET("/license", required, h.License)

	g.GET("/me", optional, h.Me)
	g.DELETE("/sessions/current", optional, h.Logout)
	g.POST("/password/change", required, h.ChangePassword)
}
