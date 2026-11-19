package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/dto"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

func (h *Handler) License(c *gin.Context) {
	principal, ok := principalFrom(c)
	if !ok {
		response.Error(c, unauthorized())
		return
	}

	current, err := h.svc.TenantLicense(c.Request.Context(), principal)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, dto.License{
		Plan:         current.License.Plan,
		Status:       current.Status,
		Allowance:    current.License.MaxWebsites,
		Used:         current.Used,
		Remaining:    current.Remaining,
		LimitReached: current.LimitReached,
		ValidUntil:   current.License.ExpiresAt,
	})
}
