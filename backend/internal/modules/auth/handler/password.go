package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/dto"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
	"github.com/ryuga/ryugaware/backend/internal/shared/binding"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

func unauthorized() error {
	return apperrors.Unauthorized("Authentication required")
}

func (h *Handler) ForgotPassword(c *gin.Context) {
	var in dto.ForgotPassword
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}
	if err := h.svc.ForgotPassword(c.Request.Context(), in.Email, c.ClientIP()); err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, dto.Sent{Sent: true})
}

func (h *Handler) ValidateResetToken(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		response.Error(c, apperrors.Validation("Request validation failed",
			apperrors.FieldError{Field: "token", Message: "This field is required."}))
		return
	}

	valid, err := h.svc.ValidateResetToken(c.Request.Context(), token)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, dto.ResetTokenCheck{Valid: valid})
}

func (h *Handler) ResetPassword(c *gin.Context) {
	var in dto.ResetPassword
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}
	if err := h.svc.ResetPassword(c.Request.Context(), in.Token, in.NewPassword); err != nil {
		response.Error(c, err)
		return
	}
	h.clearSessionCookies(c)
	response.OK(c, dto.Reset{Reset: true})
}

func (h *Handler) ChangePassword(c *gin.Context) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}

	var in dto.ChangePassword
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}
	if err := h.svc.ChangePassword(c.Request.Context(), principal, in.CurrentPassword, in.NewPassword); err != nil {
		response.Error(c, err)
		return
	}

	h.clearSessionCookies(c)
	response.OK(c, dto.Changed{Changed: true})
}
