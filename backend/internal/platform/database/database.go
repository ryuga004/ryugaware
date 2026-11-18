package database

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"

	"github.com/ryuga/ryugaware/backend/internal/config"
)

func New(ctx context.Context, cfg config.Postgres, log *slog.Logger) (*gorm.DB, error) {
	gormCfg := &gorm.Config{
		Logger: newGormLogger(log, cfg.SlowThreshold),

		NamingStrategy: schema.NamingStrategy{SingularTable: false},

		SkipDefaultTransaction: true,
		TranslateError:         false,
	}

	db, err := gorm.Open(postgres.Open(cfg.DSN()), gormCfg)
	if err != nil {
		return nil, fmt.Errorf("database: open: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("database: unwrap sql.DB: %w", err)
	}
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	sqlDB.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

	if err := sqlDB.PingContext(ctx); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("database: ping %s:%d/%s: %w", cfg.Host, cfg.Port, cfg.Database, err)
	}

	log.Info("postgres connected",
		slog.String("host", cfg.Host),
		slog.Int("port", cfg.Port),
		slog.String("database", cfg.Database),
		slog.String("sslmode", cfg.SSLMode),
		slog.Int("max_open_conns", cfg.MaxOpenConns),
	)
	return db, nil
}

func Ping(ctx context.Context, db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}

func Close(db *gorm.DB) error {
	if db == nil {
		return nil
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func Stats(db *gorm.DB) map[string]any {
	sqlDB, err := db.DB()
	if err != nil {
		return map[string]any{}
	}
	s := sqlDB.Stats()
	return map[string]any{
		"open_connections": s.OpenConnections,
		"in_use":           s.InUse,
		"idle":             s.Idle,
		"wait_count":       s.WaitCount,
		"wait_duration_ms": s.WaitDuration.Milliseconds(),
	}
}

func InTransaction(ctx context.Context, db *gorm.DB, fn func(tx *gorm.DB) error) error {
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(tx)
	})
}

const (
	sqlStateUniqueViolation     = "23505"
	sqlStateForeignKeyViolation = "23503"
	sqlStateCheckViolation      = "23514"
	sqlStateNotNullViolation    = "23502"
)

func IsNotFound(err error) bool { return errors.Is(err, gorm.ErrRecordNotFound) }

func pgErrCode(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code
	}
	return ""
}

func IsUniqueViolation(err error) bool { return pgErrCode(err) == sqlStateUniqueViolation }

func ConstraintName(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.ConstraintName
	}
	return ""
}

func IsForeignKeyViolation(err error) bool { return pgErrCode(err) == sqlStateForeignKeyViolation }

func IsConstraintViolation(err error) bool {
	switch pgErrCode(err) {
	case sqlStateUniqueViolation, sqlStateForeignKeyViolation,
		sqlStateCheckViolation, sqlStateNotNullViolation:
		return true
	}
	return false
}

const slowQueryThresholdFloor = 50 * time.Millisecond
