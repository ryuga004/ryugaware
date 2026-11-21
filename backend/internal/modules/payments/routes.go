package payments

import (
	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/modules/payments/handler"
	"github.com/ryuga/ryugaware/backend/internal/shared/middleware"
)

func RegisterRoutes(group *gin.RouterGroup, h *handler.Handler, auth middleware.Authenticator) {
	g := group.Group("/payments", middleware.Authenticate(auth, true))

	g.GET("/methods", h.List)
	g.POST("/methods", h.Create)
	g.GET("/methods/:id", h.Get)
	g.PATCH("/methods/:id", h.Patch)
	g.DELETE("/methods/:id", h.Delete)
	g.POST("/methods/:id/process", h.Process)
}
