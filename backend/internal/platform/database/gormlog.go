package database

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/ryuga/ryugaware/backend/internal/platform/logger"
)

// gormLogger adapts GORM's logging interface onto slog so database output has
// the same shape, levels and request correlation as everything else.
//
// It deliberately logs the SQL text but never the bound parameters: parameters
// routinely contain e-mail addresses, tokens and password hashes.
type gormLogger struct {
	fallback      *slog.Logger
	slowThreshold time.Duration
	level         gormlogger.LogLevel
}

func newGormLogger(l *slog.Logger, slowThreshold time.Duration) gormlogger.Interface {
	if slowThreshold < slowQueryThresholdFloor {
		slowThreshold = slowQueryThresholdFloor
	}
	return &gormLogger{
		fallback:      logger.Module(l, "database"),
		slowThreshold: slowThreshold,
		level:         gormlogger.Warn,
	}
}

func (g *gormLogger) LogMode(level gormlogger.LogLevel) gormlogger.Interface {
	cp := *g
	cp.level = level
	return &cp
}

// log resolves the request-scoped logger so queries inherit the request id.
func (g *gormLogger) log(ctx context.Context) *slog.Logger {
	return logger.FromContext(ctx, g.fallback)
}

func (g *gormLogger) Info(ctx context.Context, msg string, args ...any) {
	if g.level >= gormlogger.Info {
		g.log(ctx).Info("gorm", slog.String("message", formatMessage(msg, args...)))
	}
}

func (g *gormLogger) Warn(ctx context.Context, msg string, args ...any) {
	if g.level >= gormlogger.Warn {
		g.log(ctx).Warn("gorm", slog.String("message", formatMessage(msg, args...)))
	}
}

func (g *gormLogger) Error(ctx context.Context, msg string, args ...any) {
	if g.level >= gormlogger.Error {
		g.log(ctx).Error("gorm", slog.String("message", formatMessage(msg, args...)))
	}
}

// Trace is called once per statement with its duration and outcome.
func (g *gormLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	if g.level <= gormlogger.Silent {
		return
	}
	elapsed := time.Since(begin)
	sql, rows := fc()
	l := g.log(ctx)

	attrs := []any{
		slog.String("sql", sql),
		slog.Int64("rows", rows),
		slog.Duration("elapsed", elapsed),
	}

	switch {
	// "no rows" is a normal control-flow signal for repositories, not an error.
	case err != nil && !errors.Is(err, gorm.ErrRecordNotFound):
		if g.level >= gormlogger.Error {
			l.Error("query failed", append(attrs, logger.Err(err))...)
		}
	case elapsed > g.slowThreshold:
		if g.level >= gormlogger.Warn {
			l.Warn("slow query", append(attrs, slog.Duration("threshold", g.slowThreshold))...)
		}
	default:
		if g.level >= gormlogger.Info {
			l.Debug("query", attrs...)
		}
	}
}

// formatMessage keeps GORM's printf-style messages readable without pulling in fmt.Sprintf
// when there is nothing to interpolate.
func formatMessage(msg string, args ...any) string {
	if len(args) == 0 {
		return msg
	}
	return msg + " " + sprint(args)
}
