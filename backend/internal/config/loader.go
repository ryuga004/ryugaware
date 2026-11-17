package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// loader reads typed values from the environment, accumulating every parse
// failure so a misconfigured deployment reports all of its problems at once
// instead of one per restart.
type loader struct {
	problems []string
}

func (l *loader) fail(format string, args ...any) {
	l.problems = append(l.problems, fmt.Sprintf(format, args...))
}

func (l *loader) err() error {
	if len(l.problems) == 0 {
		return nil
	}
	return fmt.Errorf("config: %d invalid setting(s):\n  - %s", len(l.problems), strings.Join(l.problems, "\n  - "))
}

// lookup returns the trimmed value and whether it was set to something non-empty.
func lookup(key string) (string, bool) {
	v, ok := os.LookupEnv(key)
	if !ok {
		return "", false
	}
	v = strings.TrimSpace(v)
	return v, v != ""
}

func (l *loader) str(key, def string) string {
	if v, ok := lookup(key); ok {
		return v
	}
	return def
}

func (l *loader) enum(key, def string, allowed ...string) string {
	v := strings.ToLower(l.str(key, def))
	for _, a := range allowed {
		if v == a {
			return v
		}
	}
	l.fail("%s=%q is not one of [%s]", key, v, strings.Join(allowed, ", "))
	return def
}

func (l *loader) int(key string, def int) int {
	v, ok := lookup(key)
	if !ok {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		l.fail("%s=%q is not an integer", key, v)
		return def
	}
	return n
}

func (l *loader) int64(key string, def int64) int64 {
	v, ok := lookup(key)
	if !ok {
		return def
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		l.fail("%s=%q is not an integer", key, v)
		return def
	}
	return n
}

func (l *loader) bool(key string, def bool) bool {
	v, ok := lookup(key)
	if !ok {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		l.fail("%s=%q is not a boolean", key, v)
		return def
	}
	return b
}

// duration accepts Go duration syntax ("30s", "1h30m").
func (l *loader) duration(key string, def time.Duration) time.Duration {
	v, ok := lookup(key)
	if !ok {
		return def
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		l.fail("%s=%q is not a duration (e.g. 30s, 5m, 1h)", key, v)
		return def
	}
	if d < 0 {
		l.fail("%s=%q must not be negative", key, v)
		return def
	}
	return d
}

// csv splits a comma-separated list, trimming blanks.
func (l *loader) csv(key string, def []string) []string {
	v, ok := lookup(key)
	if !ok {
		return def
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		return def
	}
	return out
}

// minJWTSecretLen is the shortest HMAC key we accept outside development.
const minJWTSecretLen = 32

// Validate enforces cross-field invariants and production safety rules.
// It is called by Load, and is exported so tests can validate hand-built configs.
func (c *Config) Validate() error {
	v := &loader{}

	if c.HTTP.Port < 1 || c.HTTP.Port > 65535 {
		v.fail("HTTP_PORT=%d is outside 1-65535", c.HTTP.Port)
	}
	if c.Postgres.Host == "" {
		v.fail("POSTGRES_HOST is required")
	}
	if c.Postgres.User == "" {
		v.fail("POSTGRES_USER is required")
	}
	if c.Postgres.Database == "" {
		v.fail("POSTGRES_DB is required")
	}
	if c.Postgres.MaxIdleConns > c.Postgres.MaxOpenConns {
		v.fail("POSTGRES_MAX_IDLE_CONNS (%d) must not exceed POSTGRES_MAX_OPEN_CONNS (%d)",
			c.Postgres.MaxIdleConns, c.Postgres.MaxOpenConns)
	}
	if c.Redis.Addr == "" {
		v.fail("REDIS_ADDR is required")
	}
	if c.Storage.Bucket == "" {
		v.fail("STORAGE_BUCKET is required")
	}
	if c.Storage.MaxUploadBytes <= 0 {
		v.fail("STORAGE_MAX_UPLOAD_BYTES must be positive")
	}
	if c.Storage.IsMinIO() && c.Storage.Endpoint == "" {
		v.fail("STORAGE_ENDPOINT is required when STORAGE_PROVIDER=minio")
	}
	if c.Storage.IsMinIO() && (c.Storage.AccessKey == "" || c.Storage.SecretKey == "") {
		v.fail("STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY are required when STORAGE_PROVIDER=minio")
	}
	if c.SMTP.Host == "" {
		v.fail("SMTP_HOST is required")
	}
	if c.SMTP.FromAddress == "" || !strings.Contains(c.SMTP.FromAddress, "@") {
		v.fail("SMTP_FROM_ADDRESS must be a valid e-mail address")
	}
	if c.Auth.JWTSecret == "" {
		v.fail("AUTH_JWT_SECRET is required")
	}
	if c.Auth.BcryptCost < 10 || c.Auth.BcryptCost > 31 {
		v.fail("AUTH_BCRYPT_COST=%d is outside the supported 10-31 range", c.Auth.BcryptCost)
	}
	if c.Auth.AccessTokenTTL <= 0 || c.Auth.RefreshTokenTTL <= 0 {
		v.fail("AUTH_ACCESS_TOKEN_TTL and AUTH_REFRESH_TOKEN_TTL must be positive")
	}
	if c.Auth.AccessTokenTTL >= c.Auth.RefreshTokenTTL {
		v.fail("AUTH_ACCESS_TOKEN_TTL must be shorter than AUTH_REFRESH_TOKEN_TTL")
	}
	if c.Messaging.Stream == "" || c.Messaging.DLQStream == "" {
		v.fail("EVENTS_STREAM and EVENTS_DLQ_STREAM are required")
	}
	if c.Messaging.Stream == c.Messaging.DLQStream {
		v.fail("EVENTS_DLQ_STREAM must differ from EVENTS_STREAM")
	}
	if c.Messaging.MaxRetries < 1 {
		v.fail("EVENTS_MAX_RETRIES must be at least 1")
	}
	if c.Messaging.BatchSize < 1 {
		v.fail("EVENTS_BATCH_SIZE must be at least 1")
	}

	// Rules that only apply once real user data is involved.
	if c.App.IsProduction() {
		if len(c.Auth.JWTSecret) < minJWTSecretLen {
			v.fail("AUTH_JWT_SECRET must be at least %d characters in production", minJWTSecretLen)
		}
		if c.Postgres.SSLMode == "disable" {
			v.fail("POSTGRES_SSLMODE must not be 'disable' in production")
		}
		if c.Postgres.Password == "" {
			v.fail("POSTGRES_PASSWORD is required in production")
		}
		if c.SMTP.TLSMode == SMTPTLSNone {
			v.fail("SMTP_TLS_MODE must be starttls or tls in production")
		}
		if c.SMTP.InsecureSkipVerify {
			v.fail("SMTP_INSECURE_SKIP_VERIFY must be false in production")
		}
		if c.Storage.Provider != "s3" {
			v.fail("STORAGE_PROVIDER should be 's3' in production")
		}
		for _, o := range c.HTTP.CORS.AllowedOrigins {
			if o == "*" && c.HTTP.CORS.AllowCredentials {
				v.fail("CORS_ALLOWED_ORIGINS='*' cannot be combined with CORS_ALLOW_CREDENTIALS=true")
			}
		}
		if c.Log.Format != "json" {
			v.fail("LOG_FORMAT must be 'json' in production")
		}
	}

	return v.err()
}
