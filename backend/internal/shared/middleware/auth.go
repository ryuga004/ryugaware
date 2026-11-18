package middleware

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

const (
	IdentityKey       = "identity"
	AccessCookieName  = "access_token"
	RefreshCookieName = "refresh_token"
)

type Identity struct {
	UserID     string
	TenantID   string
	SessionID  string
	TokenID    string
	Role       string
	Privileges []string
	IssuedAt   time.Time
	ExpiresAt  time.Time
}

func (i Identity) Has(privilege string) bool {
	for _, name := range i.Privileges {
		if name == privilege {
			return true
		}
	}
	return false
}

type Authenticator interface {
	Authenticate(ctx context.Context, accessToken string) (*Identity, error)
}

func Authenticate(auth Authenticator, required bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(AccessCookieName)
		if err != nil || token == "" {
			if required {
				response.Error(c, apperrors.Unauthorized("Authentication required"))
				return
			}
			c.Next()
			return
		}

		identity, err := auth.Authenticate(c.Request.Context(), token)
		if err != nil {
			if required {
				response.Error(c, err)
				return
			}
			c.Next()
			return
		}

		c.Set(IdentityKey, identity)
		c.Next()
	}
}

func RequirePrivilege(privilege string) gin.HandlerFunc {
	return func(c *gin.Context) {
		identity, ok := IdentityFrom(c)
		if !ok {
			response.Error(c, apperrors.Unauthorized("Authentication required"))
			return
		}
		if !identity.Has(privilege) {
			response.Error(c, apperrors.Forbidden("Access denied"))
			return
		}
		c.Next()
	}
}

func IdentityFrom(c *gin.Context) (*Identity, bool) {
	value, exists := c.Get(IdentityKey)
	if !exists {
		return nil, false
	}
	identity, ok := value.(*Identity)
	return identity, ok
}
