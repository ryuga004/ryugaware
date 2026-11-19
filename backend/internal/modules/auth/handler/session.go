package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/dto"
	"github.com/ryuga/ryugaware/backend/internal/shared/binding"
	"github.com/ryuga/ryugaware/backend/internal/shared/middleware"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

func (h *Handler) Login(c *gin.Context) {
	var in dto.Login
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}

	result, err := h.svc.Login(c.Request.Context(), in.Email, in.Password, c.ClientIP())
	if err != nil {
		response.Error(c, err)
		return
	}

	h.setSessionCookies(c, result.Tokens)
	response.OK(c, dto.Authenticated{
		Authenticated: true,
		User: dto.SessionUser{
			FullName: result.User.FullName,
			Email:    result.User.Email,
			OrgName:  result.Tenant.Name,
		},
	})
}

func (h *Handler) Me(c *gin.Context) {
	principal, ok := principalFrom(c)
	if !ok {
		response.OK(c, dto.Me{Authenticated: false})
		return
	}

	current, err := h.svc.CurrentUser(c.Request.Context(), principal)
	if err != nil {
		response.OK(c, dto.Me{Authenticated: false})
		return
	}

	response.OK(c, dto.Me{
		Authenticated: true,
		User: &dto.CurrentUser{
			ID:                current.User.ID.String(),
			FullName:          current.User.FullName,
			Email:             current.User.Email,
			OrgName:           current.Tenant.Name,
			TenantID:          current.Tenant.ID.String(),
			Role:              current.Role,
			Privileges:        current.Privileges,
			CreatedAt:         current.User.CreatedAt,
			PasswordChangedAt: current.User.PasswordChangedAt,
		},
	})
}

func (h *Handler) Refresh(c *gin.Context) {
	token, err := c.Cookie(middleware.RefreshCookieName)
	if err != nil || token == "" {
		response.Error(c, unauthorized())
		return
	}

	tokens, err := h.svc.Refresh(c.Request.Context(), token)
	if err != nil {
		h.clearSessionCookies(c)
		response.Error(c, err)
		return
	}

	h.setSessionCookies(c, *tokens)
	response.OK(c, dto.Refreshed{Refreshed: true})
}

func (h *Handler) Logout(c *gin.Context) {
	principal, _ := principalFrom(c)
	refresh, _ := c.Cookie(middleware.RefreshCookieName)

	if err := h.svc.Logout(c.Request.Context(), principal, refresh); err != nil {
		response.Error(c, err)
		return
	}

	h.clearSessionCookies(c)
	response.OK(c, dto.LoggedOut{LoggedOut: true})
}
