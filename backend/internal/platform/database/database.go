// Package database owns the PostgreSQL connection and the small set of helpers
// repositories need (transactions, driver error classification).
//
// Schema changes are never applied from here: GORM's AutoMigrate is
// deliberately unused, and `cmd/migrate` applies versioned SQL instead. That
// keeps schema evolution reviewable, repeatable and independent of API boot.
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

// New opens the pool, verifies it with a ping and applies pool limits.
//
// The ping matters: without it a misconfigured DSN only surfaces on the first
// request, long after the process reported itself healthy.
func New(ctx context.Context, cfg config.Postgres, log *slog.Logger) (*gorm.DB, error) {
	gormCfg := &gorm.Config{
		Logger: newGormLogger(log, cfg.SlowThreshold),
		// The application owns naming; GORM should not pluralise unexpectedly.
		NamingStrategy: schema.NamingStrategy{SingularTable: false},
		// Timestamps are set explicitly by models, and skipping the default
		// transaction removes a round trip per write.
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

// Ping reports whether the pool can still reach the server. Used by /readyz.
func Ping(ctx context.Context, db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}

// Close drains the pool. Safe to call on a nil *gorm.DB.
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

// Stats exposes pool counters for health and metrics endpoints.
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

// InTransaction runs fn inside a single transaction bound to ctx, committing on
// success and rolling back on error or panic.
//
// fn receives the transaction handle and must use it for every query it makes;
// using the outer *gorm.DB inside fn silently escapes the transaction.
func InTransaction(ctx context.Context, db *gorm.DB, fn func(tx *gorm.DB) error) error {
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(tx)
	})
}

// PostgreSQL SQLSTATE codes this application reacts to.
const (
	sqlStateUniqueViolation     = "23505"
	sqlStateForeignKeyViolation = "23503"
	sqlStateCheckViolation      = "23514"
	sqlStateNotNullViolation    = "23502"
)

// IsNotFound reports whether a query returned no rows.
func IsNotFound(err error) bool { return errors.Is(err, gorm.ErrRecordNotFound) }

func pgErrCode(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code
	}
	return ""
}

// IsUniqueViolation reports whether err is a unique-constraint violation.
// Repositories use it to turn a race-losing insert into a domain conflict
// instead of a 500 — this is what makes "check then insert" safe.
func IsUniqueViolation(err error) bool { return pgErrCode(err) == sqlStateUniqueViolation }

// ConstraintName returns the violated constraint, so a repository can tell
// which unique index fired when a table has several.
func ConstraintName(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.ConstraintName
	}
	return ""
}

// IsForeignKeyViolation reports whether err references a missing parent row.
func IsForeignKeyViolation(err error) bool { return pgErrCode(err) == sqlStateForeignKeyViolation }

// IsConstraintViolation reports any integrity violation, for generic handling.
func IsConstraintViolation(err error) bool {
	switch pgErrCode(err) {
	case sqlStateUniqueViolation, sqlStateForeignKeyViolation,
		sqlStateCheckViolation, sqlStateNotNullViolation:
		return true
	}
	return false
}

// slowQueryThresholdFloor keeps a misconfigured zero from logging every query.
const slowQueryThresholdFloor = 50 * time.Millisecond
