package websites

import (
	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/handler"
	"github.com/ryuga/ryugaware/backend/internal/shared/middleware"
)

func RegisterRoutes(group *gin.RouterGroup, h *handler.Handler, auth middleware.Authenticator) {
	required := middleware.Authenticate(auth, true)

	group.GET("/storefront/:site", h.Storefront)

	group.GET("/storage", required, h.Storage)

	content := group.Group("/site-content", required)
	content.GET("/:id", h.GetContent)
	content.PUT("/:id", h.SaveContent)

	g := group.Group("/websites", required)

	g.GET("", h.List)
	g.GET("/check-subdomain", h.CheckSubdomain)
	g.POST("", h.Create)
	g.GET("/:id", h.Get)
	g.PATCH("/:id", h.Patch)
	g.DELETE("/:id", h.Delete)
	g.GET("/:id/pages", h.Pages)
	g.POST("/:id/assets", h.UploadAsset)
}
