package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/dto"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth/service"
	"github.com/ryuga/ryugaware/backend/internal/shared/binding"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

func (h *Handler) Register(c *gin.Context) {
	var in dto.Register
	if err := binding.JSON(c, &in); err != nil {
		response.Error(c, err)
		return
	}

	result, err := h.svc.Register(c.Request.Context(), service.RegisterInput{
		OrgName:           in.OrgName,
		FullName:          in.FullName,
		Email:             in.Email,
		Password:          in.Password,
		RegistrationToken: in.RegistrationToken,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Created(c, dto.Registered{
		Registered: true,
		Email:      result.Email,
		OrgName:    result.OrgName,
	})
}
