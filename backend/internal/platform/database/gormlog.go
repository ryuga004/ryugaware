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

func formatMessage(msg string, args ...any) string {
	if len(args) == 0 {
		return msg
	}
	return msg + " " + sprint(args)
}
