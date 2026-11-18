package logger

import (
	"context"
	"io"
	"log/slog"
	"strings"
)

type Config struct {
	Level     string
	Format    string
	AddSource bool
}

type ctxKey struct{}

const (
	KeyRequestID     = "request_id"
	KeyCorrelationID = "correlation_id"
	KeyUserID        = "user_id"
	KeyEventID       = "event_id"
	KeyEventType     = "event_type"
	KeyModule        = "module"
	KeyError         = "error"
)

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

func WithContext(ctx context.Context, l *slog.Logger) context.Context {
	if l == nil {
		return ctx
	}
	return context.WithValue(ctx, ctxKey{}, l)
}

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

func Module(l *slog.Logger, name string) *slog.Logger {
	return l.With(slog.String(KeyModule, name))
}

func Err(err error) slog.Attr {
	if err == nil {
		return slog.Attr{}
	}
	return slog.String(KeyError, err.Error())
}
