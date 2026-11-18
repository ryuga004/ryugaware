package bootstrap

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/ryuga/ryugaware/backend/internal/config"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth"
	authhandler "github.com/ryuga/ryugaware/backend/internal/modules/auth/handler"
	authrepo "github.com/ryuga/ryugaware/backend/internal/modules/auth/repository"
	authservice "github.com/ryuga/ryugaware/backend/internal/modules/auth/service"
	authstore "github.com/ryuga/ryugaware/backend/internal/modules/auth/store"
	notificationrepo "github.com/ryuga/ryugaware/backend/internal/modules/notification/repository"
	notificationservice "github.com/ryuga/ryugaware/backend/internal/modules/notification/service"
	"github.com/ryuga/ryugaware/backend/internal/platform/database"
	"github.com/ryuga/ryugaware/backend/internal/platform/email"
	"github.com/ryuga/ryugaware/backend/internal/platform/messaging"
	"github.com/ryuga/ryugaware/backend/internal/platform/redis"
)

type modules struct {
	auth         *authservice.Service
	notification *notificationservice.Service
}

type mailer struct {
	sender *email.Sender
}

func (m mailer) Send(ctx context.Context, to, subject, body string) error {
	return m.sender.Send(ctx, email.Message{To: to, Subject: subject, HTML: body})
}

type eventPublisher struct {
	publisher *messaging.Publisher
}

func (e eventPublisher) Publish(ctx context.Context, evt authservice.Event) error {
	metadata := map[string]any{}
	if evt.TenantID != nil {
		metadata["tenant_id"] = evt.TenantID.String()
	}
	if evt.AggregateID != nil {
		metadata["aggregate_id"] = evt.AggregateID.String()
	}
	return e.publisher.Publish(ctx, messaging.Envelope{
		EventType: evt.Type,
		Payload:   evt.Payload,
		Metadata:  metadata,
	})
}

func registerModules(
	ctx context.Context,
	router *gin.Engine,
	cfg *config.Config,
	log *slog.Logger,
	db *gorm.DB,
	rdb *redis.Client,
	publisher *messaging.Publisher,
) (*modules, error) {
	repo := authrepo.New(db)

	cache := authstore.New(rdb, authstore.Config{
		OTPTTL:               cfg.Auth.OTPTTL,
		OTPMaxAttempts:       cfg.Auth.OTPMaxAttempts,
		OTPResendCooldown:    cfg.Auth.OTPResendCooldown,
		OTPBlacklistTTL:      cfg.Auth.OTPBlacklistTTL,
		RegistrationProofTTL: cfg.Auth.RegistrationProofTTL,
		RefreshTTL:           cfg.Auth.RefreshTokenTTL,
	})

	authSvc := authservice.New(repo, cache, eventPublisher{publisher: publisher}, authservice.Policy{
		BcryptCost:           cfg.Auth.BcryptCost,
		AccessTokenTTL:       cfg.Auth.AccessTokenTTL,
		RefreshTokenTTL:      cfg.Auth.RefreshTokenTTL,
		PasswordResetTTL:     cfg.Auth.PasswordResetTTL,
		RegistrationProofTTL: cfg.Auth.RegistrationProofTTL,
		OTPTTL:               cfg.Auth.OTPTTL,
		MaxActiveSessions:    cfg.Auth.MaxActiveSessions,
		LoginRateLimit:       cfg.Auth.LoginRateLimit,
		LoginRateWindow:      cfg.Auth.LoginRateWindow,
		JWTIssuer:            cfg.Auth.JWTIssuer,
		TenantKeyCacheTTL:    cfg.Auth.TenantKeyCacheTTL,
		TokenHMACKey:         authservice.DeriveTokenKey(cfg.Auth.TokenHMACSecret),
		PublicBaseURL:        cfg.App.PublicBaseURL,
	})

	authHandler := authhandler.New(authSvc, authhandler.CookieConfig{
		Domain:     cfg.Auth.CookieDomain,
		Secure:     cfg.App.IsProduction(),
		AccessTTL:  cfg.Auth.AccessTokenTTL,
		RefreshTTL: cfg.Auth.RefreshTokenTTL,
	})

	notificationSvc := notificationservice.New(
		notificationrepo.New(db),
		mailer{sender: email.New(cfg.SMTP)},
	)

	v1 := router.Group("/api/v1")
	auth.RegisterRoutes(v1, authHandler, auth.NewAuthenticator(authSvc))
	registerHealth(router, db, rdb)

	if cfg.Auth.BootstrapAdminEmail != "" {
		created, err := authSvc.EnsurePlatformAdmin(ctx,
			cfg.Auth.BootstrapAdminEmail, cfg.Auth.BootstrapAdminPassword, cfg.Auth.BootstrapAdminName)
		if err != nil {
			return nil, err
		}
		if created {
			log.Info("platform super admin created")
		}
	}

	return &modules{auth: authSvc, notification: notificationSvc}, nil
}

func registerHealth(router *gin.Engine, db *gorm.DB, rdb *redis.Client) {
	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	router.GET("/readyz", func(c *gin.Context) {
		ctx := c.Request.Context()
		if err := database.Ping(ctx, db); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "degraded", "dependency": "postgres"})
			return
		}
		if err := rdb.Ping(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "degraded", "dependency": "redis"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
}
