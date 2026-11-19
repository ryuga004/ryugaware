package templates

import (
	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/modules/templates/handler"
	"github.com/ryuga/ryugaware/backend/internal/shared/middleware"
)

func RegisterRoutes(group *gin.RouterGroup, h *handler.Handler, auth middleware.Authenticator) {
	required := middleware.Authenticate(auth, true)

	g := group.Group("/templates", required)
	g.GET("", h.List)
	g.GET("/:slug", h.Get)
	g.GET("/:slug/pages/:key", h.GetPage)
}
