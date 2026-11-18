package bootstrap

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/ryuga/ryugaware/backend/internal/config"
	notificationservice "github.com/ryuga/ryugaware/backend/internal/modules/notification/service"
	"github.com/ryuga/ryugaware/backend/internal/platform/database"
	"github.com/ryuga/ryugaware/backend/internal/platform/messaging"
	"github.com/ryuga/ryugaware/backend/internal/platform/redis"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
	"github.com/ryuga/ryugaware/backend/internal/shared/middleware"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

type App struct {
	cfg       *config.Config
	log       *slog.Logger
	db        *gorm.DB
	rdb       *redis.Client
	relay     *messaging.Relay
	consumers []*messaging.Consumer
	server    *http.Server
}

func New(ctx context.Context, cfg *config.Config, log *slog.Logger) (*App, error) {
	db, err := database.New(ctx, cfg.Postgres, log)
	if err != nil {
		return nil, err
	}

	rdb, err := redis.New(ctx, cfg.Redis)
	if err != nil {
		_ = database.Close(db)
		return nil, err
	}

	publisher := messaging.NewPublisher(rdb, cfg.Messaging.Stream, cfg.Messaging.MaxLen, cfg.App.Name)
	relay := messaging.NewRelay(db, publisher, log, int(cfg.Messaging.BatchSize), 2*time.Second, 30*time.Second)

	router := newRouter(cfg, log)
	modules, err := registerModules(ctx, router, cfg, log, db, rdb, publisher)
	if err != nil {
		_ = rdb.Close()
		_ = database.Close(db)
		return nil, err
	}

	notificationWorker := messaging.NewConsumer(rdb, messaging.ConsumerConfig{
		Stream:         cfg.Messaging.Stream,
		DLQStream:      cfg.Messaging.DLQStream,
		Group:          "notification-worker",
		Name:           cfg.App.Name + "-" + uuid.NewString()[:8],
		EventTypes:     []string{notificationservice.EventEmailRequested},
		BatchSize:      cfg.Messaging.BatchSize,
		BlockTimeout:   cfg.Messaging.BlockTimeout,
		MaxRetries:     cfg.Messaging.MaxRetries,
		ClaimMinIdle:   cfg.Messaging.ClaimMinIdle,
		ClaimInterval:  cfg.Messaging.ClaimInterval,
		HandlerTimeout: cfg.Messaging.HandlerTimeout,
	}, log, modules.notification.HandleEvent)

	server := &http.Server{
		Addr:              cfg.HTTP.Addr(),
		Handler:           router,
		ReadTimeout:       cfg.HTTP.ReadTimeout,
		ReadHeaderTimeout: cfg.HTTP.ReadHeaderTimeout,
		WriteTimeout:      cfg.HTTP.WriteTimeout,
		IdleTimeout:       cfg.HTTP.IdleTimeout,
		MaxHeaderBytes:    cfg.HTTP.MaxHeaderBytes,
	}

	return &App{
		cfg:       cfg,
		log:       log,
		db:        db,
		rdb:       rdb,
		relay:     relay,
		consumers: []*messaging.Consumer{notificationWorker},
		server:    server,
	}, nil
}

func (a *App) Run(ctx context.Context) error {
	workerCtx, stopWorkers := context.WithCancel(context.WithoutCancel(ctx))
	defer stopWorkers()

	if a.cfg.Messaging.WorkersEnabled {
		go a.relay.Run(workerCtx)
		for _, consumer := range a.consumers {
			go consumer.Run(workerCtx)
		}
	}

	errCh := make(chan error, 1)
	go func() {
		a.log.Info("http server listening", slog.String("addr", a.cfg.HTTP.Addr()))
		if err := a.server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case err := <-errCh:
		stopWorkers()
		a.closeResources()
		return err
	case <-ctx.Done():
	}

	a.log.Info("shutdown started", slog.Duration("timeout", a.cfg.App.ShutdownTimeout))
	shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), a.cfg.App.ShutdownTimeout)
	defer cancel()

	shutdownErr := a.server.Shutdown(shutdownCtx)
	stopWorkers()
	a.closeResources()

	if shutdownErr != nil {
		return fmt.Errorf("bootstrap: shutdown: %w", shutdownErr)
	}
	a.log.Info("shutdown complete")
	return nil
}

func (a *App) closeResources() {
	if err := a.rdb.Close(); err != nil {
		a.log.Error("closing redis failed", slog.String("error", err.Error()))
	}
	if err := database.Close(a.db); err != nil {
		a.log.Error("closing postgres failed", slog.String("error", err.Error()))
	}
}

func newRouter(cfg *config.Config, log *slog.Logger) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()

	if err := router.SetTrustedProxies(cfg.HTTP.TrustedProxies); err != nil {
		log.Warn("trusted proxies rejected", slog.String("error", err.Error()))
	}

	router.Use(
		middleware.RequestID(),
		middleware.RequestLogger(log),
		middleware.Recovery(),
		middleware.SecurityHeaders(),
		middleware.CORS(cfg.HTTP.CORS),
		middleware.BodyLimit(cfg.HTTP.BodyLimitBytes),
		middleware.Timeout(cfg.HTTP.WriteTimeout),
	)

	router.NoRoute(func(c *gin.Context) {
		response.Error(c, apperrors.NotFound("resource"))
	})
	router.NoMethod(func(c *gin.Context) {
		response.Error(c, apperrors.New(apperrors.CodeBadRequest, "Method not allowed"))
	})

	return router
}
