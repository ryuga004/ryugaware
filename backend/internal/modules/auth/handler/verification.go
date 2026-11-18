package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/dto"
	"github.com/ryuga/ryugaware/backend/internal/shared/binding"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

func (h *Handler) RequestOTP(c *gin.Context) {
	var in dto.RequestOTP
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}
	if err := h.svc.RequestOTP(c.Request.Context(), in.Email); err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, dto.Sent{Sent: true})
}

func (h *Handler) ResendOTP(c *gin.Context) {
	var in dto.RequestOTP
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}
	if err := h.svc.ResendOTP(c.Request.Context(), in.Email); err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, dto.Sent{Sent: true})
}

func (h *Handler) VerifyOTP(c *gin.Context) {
	var in dto.VerifyOTP
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}
	token, err := h.svc.VerifyOTP(c.Request.Context(), in.Email, in.OTP)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.OK(c, dto.Verified{Verified: true, RegistrationToken: token})
}
