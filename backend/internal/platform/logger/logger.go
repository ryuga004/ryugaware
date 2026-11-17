// Package logger builds the application's structured logger.
//
// It wraps log/slog rather than a third-party library: slog already provides
// levelled, structured, handler-pluggable logging, and staying on the standard
// library keeps every package free of a logging dependency it cannot swap.
//
// Request-scoped fields (request id, correlation id, user id) are attached by
// storing a derived *slog.Logger in the request context; see FromContext.
package logger

import (
	"context"
	"io"
	"log/slog"
	"strings"
)

// Config describes how to build the root logger.
type Config struct {
	Level     string
	Format    string // "json" or "text"
	AddSource bool
}

// Context keys for the request-scoped logger. A private type prevents
// collisions with keys set by other packages.
type ctxKey struct{}

// Standard attribute keys. Using constants keeps field names consistent across
// modules, which is what makes structured logs queryable.
const (
	KeyRequestID     = "request_id"
	KeyCorrelationID = "correlation_id"
	KeyUserID        = "user_id"
	KeyEventID       = "event_id"
	KeyEventType     = "event_type"
	KeyModule        = "module"
	KeyError         = "error"
)

// New builds the root logger. Output is written to w (normally os.Stdout);
// container runtimes are expected to collect stdout.
func New(cfg Config, w io.Writer) *slog.Logger {
	opts := &slog.HandlerOptions{
		Level:       parseLevel(cfg.Level),
		AddSource:   cfg.AddSource,
		ReplaceAttr: redactAttr,
	}

	var h slog.Handler
	if strings.EqualFold(cfg.Format, "text") {
		h = slog.NewTextHandler(w, opts)
	} else {
		h = slog.NewJSONHandler(w, opts)
	}
	return slog.New(h)
}

func parseLevel(s string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// sensitiveKeys are never printed, regardless of which package logs them.
// This is a safety net: the primary rule is simply not to log secrets.
var sensitiveKeys = map[string]struct{}{
	"password":      {},
	"new_password":  {},
	"old_password":  {},
	"token":         {},
	"access_token":  {},
	"refresh_token": {},
	"secret":        {},
	"authorization": {},
	"api_key":       {},
	"cookie":        {},
	"set-cookie":    {},
}

func redactAttr(_ []string, a slog.Attr) slog.Attr {
	if _, ok := sensitiveKeys[strings.ToLower(a.Key)]; ok {
		return slog.String(a.Key, "[REDACTED]")
	}
	return a
}

// WithContext returns a copy of ctx carrying l, so downstream code can log with
// the request's fields already attached.
func WithContext(ctx context.Context, l *slog.Logger) context.Context {
	if l == nil {
		return ctx
	}
	return context.WithValue(ctx, ctxKey{}, l)
}

// FromContext returns the request-scoped logger, falling back to fallback and
// finally to slog.Default so callers never have to nil-check.
func FromContext(ctx context.Context, fallback *slog.Logger) *slog.Logger {
	if ctx != nil {
		if l, ok := ctx.Value(ctxKey{}).(*slog.Logger); ok && l != nil {
			return l
		}
	}
	if fallback != nil {
		return fallback
	}
	return slog.Default()
}

// Module returns a logger tagged with the owning module name.
func Module(l *slog.Logger, name string) *slog.Logger {
	return l.With(slog.String(KeyModule, name))
}

// Err is a convenience attribute so error logging stays consistent.
func Err(err error) slog.Attr {
	if err == nil {
		return slog.Attr{}
	}
	return slog.String(KeyError, err.Error())
}
