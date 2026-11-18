package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/config"
	"github.com/ryuga/ryugaware/backend/internal/platform/logger"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

const headerRequestID = "X-Request-ID"

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader(headerRequestID)
		if id == "" || len(id) > 64 {
			id = uuid.NewString()
		}
		c.Set(response.RequestIDKey, id)
		c.Header(headerRequestID, id)
		c.Next()
	}
}

func RequestLogger(base *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID, _ := c.Get(response.RequestIDKey)
		id, _ := requestID.(string)
		reqLog := base.With(slog.String(logger.KeyRequestID, id))
		c.Request = c.Request.WithContext(logger.WithContext(c.Request.Context(), reqLog))

		started := time.Now()
		c.Next()

		reqLog.Info("request",
			slog.String("method", c.Request.Method),
			slog.String("path", c.FullPath()),
			slog.Int("status", c.Writer.Status()),
			slog.Duration("duration", time.Since(started)),
		)
	}
}

func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if recovered := recover(); recovered != nil {
				logger.FromContext(c.Request.Context(), nil).Error("panic recovered",
					slog.Any("panic", recovered),
					slog.String("path", c.FullPath()),
				)
				response.Error(c, apperrors.New(apperrors.CodeInternal, "an internal error occurred"))
			}
		}()
		c.Next()
	}
}

func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Cross-Origin-Opener-Policy", "same-origin")
		h.Set("Cache-Control", "no-store")
		c.Next()
	}
}

func CORS(cfg config.CORS) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(cfg.AllowedOrigins))
	for _, origin := range cfg.AllowedOrigins {
		allowed[origin] = struct{}{}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			if _, ok := allowed[origin]; ok {
				h := c.Writer.Header()
				h.Set("Access-Control-Allow-Origin", origin)
				h.Add("Vary", "Origin")
				h.Set("Access-Control-Allow-Methods", strings.Join(cfg.AllowedMethods, ", "))
				h.Set("Access-Control-Allow-Headers", strings.Join(cfg.AllowedHeaders, ", "))
				h.Set("Access-Control-Expose-Headers", strings.Join(cfg.ExposedHeaders, ", "))
				if cfg.AllowCredentials {
					h.Set("Access-Control-Allow-Credentials", "true")
				}
				h.Set("Access-Control-Max-Age", strconvSeconds(cfg.MaxAge))
			}
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func BodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if maxBytes > 0 && c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()
	}
}

func Timeout(d time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if d <= 0 {
			c.Next()
			return
		}
		ctx, cancel := context.WithTimeout(c.Request.Context(), d)
		defer cancel()
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

func strconvSeconds(d time.Duration) string {
	seconds := int(d.Seconds())
	if seconds < 0 {
		seconds = 0
	}
	return itoa(seconds)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}
