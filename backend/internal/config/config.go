// Package config owns all environment-driven configuration for the service.
//
// Configuration is read exactly once, at startup, by Load. Business modules
// never read environment variables themselves; bootstrap injects the narrow
// config struct each component actually needs. This keeps configuration
// testable (construct the struct directly) and makes the full set of knobs
// discoverable in one place.
package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Environment names recognised by the application.
const (
	EnvDevelopment = "development"
	EnvTest        = "test"
	EnvStaging     = "staging"
	EnvProduction  = "production"
)

// Config is the fully validated application configuration.
type Config struct {
	App       App
	HTTP      HTTP
	Postgres  Postgres
	Redis     Redis
	Storage   Storage
	SMTP      SMTP
	Log       Log
	Auth      Auth
	Messaging Messaging
}

// App holds process-wide settings.
type App struct {
	Name            string
	Env             string
	Version         string
	ShutdownTimeout time.Duration
	// PublicBaseURL is the externally reachable URL of the frontend. It is used
	// to build links embedded in e-mails (verification, password reset).
	PublicBaseURL string
}

// IsProduction reports whether the app runs with production safety rules.
func (a App) IsProduction() bool { return a.Env == EnvProduction }

// IsDevelopment reports whether the app runs in local development mode.
func (a App) IsDevelopment() bool { return a.Env == EnvDevelopment }

// HTTP holds the API server settings.
type HTTP struct {
	Host              string
	Port              int
	ReadTimeout       time.Duration
	ReadHeaderTimeout time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	MaxHeaderBytes    int
	// TrustedProxies restricts which peers Gin will believe for X-Forwarded-For.
	// Empty means "trust nobody", which is the safe default.
	TrustedProxies []string
	// BodyLimitBytes caps non-multipart request bodies.
	BodyLimitBytes int64
	CORS           CORS
}

// Addr returns the listen address for the HTTP server.
func (h HTTP) Addr() string { return fmt.Sprintf("%s:%d", h.Host, h.Port) }

// CORS holds cross-origin settings for browser clients.
type CORS struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	ExposedHeaders   []string
	AllowCredentials bool
	MaxAge           time.Duration
}

// Postgres holds database connection and pool settings.
type Postgres struct {
	Host            string
	Port            int
	User            string
	Password        string
	Database        string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
	// SlowThreshold controls when GORM logs a query as slow.
	SlowThreshold time.Duration
	// StatementTimeout is applied per connection via the DSN.
	StatementTimeout time.Duration
}

// DSN renders a libpq-style connection string.
func (p Postgres) DSN() string {
	parts := []string{
		"host=" + p.Host,
		"port=" + strconv.Itoa(p.Port),
		"user=" + p.User,
		"password=" + p.Password,
		"dbname=" + p.Database,
		"sslmode=" + p.SSLMode,
	}
	if p.StatementTimeout > 0 {
		parts = append(parts, fmt.Sprintf("statement_timeout=%d", p.StatementTimeout.Milliseconds()))
	}
	return strings.Join(parts, " ")
}

// URL renders a postgres:// URL, which is what golang-migrate expects.
func (p Postgres) URL() string {
	u := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(p.User, p.Password),
		Host:   fmt.Sprintf("%s:%d", p.Host, p.Port),
		Path:   "/" + p.Database,
	}
	q := url.Values{}
	q.Set("sslmode", p.SSLMode)
	u.RawQuery = q.Encode()
	return u.String()
}

// Redis holds cache and stream transport settings.
type Redis struct {
	Addr         string
	Password     string
	DB           int
	PoolSize     int
	MinIdleConns int
	DialTimeout  time.Duration
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	// KeyPrefix namespaces every key this application writes.
	KeyPrefix string
}

// Storage holds S3-compatible object storage settings.
type Storage struct {
	// Provider is "s3" (AWS, credentials from the default chain) or
	// "minio" (static credentials + custom endpoint).
	Provider  string
	Region    string
	Bucket    string
	Endpoint  string
	AccessKey string
	SecretKey string
	// PublicEndpoint overrides the host used in presigned URLs handed to
	// clients. Inside Docker the API talks to "minio:9000", but a browser
	// must be given "localhost:9000".
	PublicEndpoint string
	UsePathStyle   bool
	PresignExpiry  time.Duration
	MaxUploadBytes int64
	AllowedMIME    []string
}

// IsMinIO reports whether the storage client targets a MinIO-compatible endpoint.
func (s Storage) IsMinIO() bool { return s.Provider == "minio" }

// TLS modes for the SMTP transport.
const (
	SMTPTLSNone     = "none"
	SMTPTLSSTARTTLS = "starttls"
	SMTPTLSImplicit = "tls"
)

// SMTP holds outbound mail transport settings.
type SMTP struct {
	Host        string
	Port        int
	Username    string
	Password    string
	FromAddress string
	FromName    string
	// TLSMode is one of none, starttls or tls.
	TLSMode string
	// InsecureSkipVerify disables certificate verification. Local only.
	InsecureSkipVerify bool
	Timeout            time.Duration
}

// Addr returns the SMTP dial address.
func (s SMTP) Addr() string { return fmt.Sprintf("%s:%d", s.Host, s.Port) }

// Log holds structured logging settings.
type Log struct {
	Level string
	// Format is "json" or "text".
	Format    string
	AddSource bool
}

// Auth holds credentials, token and rate-limit policy for the auth module.
type Auth struct {
	JWTSecret            string
	JWTIssuer            string
	AccessTokenTTL       time.Duration
	RefreshTokenTTL      time.Duration
	BcryptCost           int
	EmailVerificationTTL time.Duration
	PasswordResetTTL     time.Duration
	// MaxActiveSessions caps concurrent refresh tokens per user. 0 disables the cap.
	MaxActiveSessions int
	// LoginRateLimit allows N attempts per LoginRateWindow per IP+identifier.
	LoginRateLimit  int
	LoginRateWindow time.Duration
	// RolesCacheTTL controls how long resolved roles are cached in Redis.
	RolesCacheTTL time.Duration
	// BootstrapAdminEmail, when set, is granted the admin role by migration seed.
	BootstrapAdminEmail string
}

// Messaging holds Redis Streams event-bus settings.
type Messaging struct {
	Stream    string
	DLQStream string
	// MaxLen approximately caps the stream length. 0 disables trimming.
	MaxLen int64
	// LiveChannel is the Pub/Sub channel used for ephemeral, droppable signals.
	LiveChannel string
	// Consumer defaults, applied to every worker unless overridden.
	BatchSize     int64
	BlockTimeout  time.Duration
	MaxRetries    int64
	ClaimMinIdle  time.Duration
	ClaimInterval time.Duration
	// HandlerTimeout bounds how long a single event handler may run.
	HandlerTimeout time.Duration
	// Enabled allows running the API with workers disabled (e.g. a web-only replica).
	WorkersEnabled bool
}

// Load reads configuration from the process environment, optionally seeded by
// a .env file, validates it and returns the typed result.
//
// Precedence: real environment variables always win over .env entries.
func Load() (*Config, error) {
	// godotenv.Load never overwrites variables that are already set, so a value
	// exported by the shell or injected by the orchestrator takes precedence.
	for _, f := range dotenvFiles() {
		if _, err := os.Stat(f); err == nil {
			if err := godotenv.Load(f); err != nil {
				return nil, fmt.Errorf("config: loading %s: %w", f, err)
			}
		}
	}

	l := &loader{}
	cfg := &Config{
		App: App{
			Name:            l.str("APP_NAME", "ryugaware-api"),
			Env:             l.enum("APP_ENV", EnvDevelopment, EnvDevelopment, EnvTest, EnvStaging, EnvProduction),
			Version:         l.str("APP_VERSION", "dev"),
			ShutdownTimeout: l.duration("APP_SHUTDOWN_TIMEOUT", 20*time.Second),
			PublicBaseURL:   l.str("APP_PUBLIC_BASE_URL", "http://localhost:3000"),
		},
		HTTP: HTTP{
			Host:              l.str("HTTP_HOST", "0.0.0.0"),
			Port:              l.int("HTTP_PORT", 8080),
			ReadTimeout:       l.duration("HTTP_READ_TIMEOUT", 15*time.Second),
			ReadHeaderTimeout: l.duration("HTTP_READ_HEADER_TIMEOUT", 5*time.Second),
			WriteTimeout:      l.duration("HTTP_WRITE_TIMEOUT", 30*time.Second),
			IdleTimeout:       l.duration("HTTP_IDLE_TIMEOUT", 60*time.Second),
			MaxHeaderBytes:    l.int("HTTP_MAX_HEADER_BYTES", 1<<20),
			TrustedProxies:    l.csv("HTTP_TRUSTED_PROXIES", nil),
			BodyLimitBytes:    l.int64("HTTP_BODY_LIMIT_BYTES", 1<<20),
			CORS: CORS{
				AllowedOrigins:   l.csv("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
				AllowedMethods:   l.csv("CORS_ALLOWED_METHODS", []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}),
				AllowedHeaders:   l.csv("CORS_ALLOWED_HEADERS", []string{"Authorization", "Content-Type", "X-Request-ID"}),
				ExposedHeaders:   l.csv("CORS_EXPOSED_HEADERS", []string{"X-Request-ID"}),
				AllowCredentials: l.bool("CORS_ALLOW_CREDENTIALS", true),
				MaxAge:           l.duration("CORS_MAX_AGE", 12*time.Hour),
			},
		},
		Postgres: Postgres{
			Host:             l.str("POSTGRES_HOST", "localhost"),
			Port:             l.int("POSTGRES_PORT", 5432),
			User:             l.str("POSTGRES_USER", "ryugaware"),
			Password:         l.str("POSTGRES_PASSWORD", ""),
			Database:         l.str("POSTGRES_DB", "ryugaware"),
			SSLMode:          l.enum("POSTGRES_SSLMODE", "disable", "disable", "allow", "prefer", "require", "verify-ca", "verify-full"),
			MaxOpenConns:     l.int("POSTGRES_MAX_OPEN_CONNS", 25),
			MaxIdleConns:     l.int("POSTGRES_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime:  l.duration("POSTGRES_CONN_MAX_LIFETIME", time.Hour),
			ConnMaxIdleTime:  l.duration("POSTGRES_CONN_MAX_IDLE_TIME", 10*time.Minute),
			SlowThreshold:    l.duration("POSTGRES_SLOW_QUERY_THRESHOLD", 300*time.Millisecond),
			StatementTimeout: l.duration("POSTGRES_STATEMENT_TIMEOUT", 15*time.Second),
		},
		Redis: Redis{
			Addr:         l.str("REDIS_ADDR", "localhost:6379"),
			Password:     l.str("REDIS_PASSWORD", ""),
			DB:           l.int("REDIS_DB", 0),
			PoolSize:     l.int("REDIS_POOL_SIZE", 20),
			MinIdleConns: l.int("REDIS_MIN_IDLE_CONNS", 2),
			DialTimeout:  l.duration("REDIS_DIAL_TIMEOUT", 5*time.Second),
			ReadTimeout:  l.duration("REDIS_READ_TIMEOUT", 3*time.Second),
			WriteTimeout: l.duration("REDIS_WRITE_TIMEOUT", 3*time.Second),
			KeyPrefix:    l.str("REDIS_KEY_PREFIX", "ryugaware"),
		},
		Storage: Storage{
			Provider:       l.enum("STORAGE_PROVIDER", "minio", "s3", "minio"),
			Region:         l.str("STORAGE_REGION", "us-east-1"),
			Bucket:         l.str("STORAGE_BUCKET", "ryugaware"),
			Endpoint:       l.str("STORAGE_ENDPOINT", ""),
			AccessKey:      l.str("STORAGE_ACCESS_KEY", ""),
			SecretKey:      l.str("STORAGE_SECRET_KEY", ""),
			PublicEndpoint: l.str("STORAGE_PUBLIC_ENDPOINT", ""),
			UsePathStyle:   l.bool("STORAGE_USE_PATH_STYLE", true),
			PresignExpiry:  l.duration("STORAGE_PRESIGN_EXPIRY", 15*time.Minute),
			MaxUploadBytes: l.int64("STORAGE_MAX_UPLOAD_BYTES", 5<<20),
			AllowedMIME:    l.csv("STORAGE_ALLOWED_MIME", []string{"image/jpeg", "image/png", "image/webp"}),
		},
		SMTP: SMTP{
			Host:               l.str("SMTP_HOST", "localhost"),
			Port:               l.int("SMTP_PORT", 1025),
			Username:           l.str("SMTP_USERNAME", ""),
			Password:           l.str("SMTP_PASSWORD", ""),
			FromAddress:        l.str("SMTP_FROM_ADDRESS", "no-reply@ryugaware.local"),
			FromName:           l.str("SMTP_FROM_NAME", "Ryugaware"),
			TLSMode:            l.enum("SMTP_TLS_MODE", SMTPTLSNone, SMTPTLSNone, SMTPTLSSTARTTLS, SMTPTLSImplicit),
			InsecureSkipVerify: l.bool("SMTP_INSECURE_SKIP_VERIFY", false),
			Timeout:            l.duration("SMTP_TIMEOUT", 15*time.Second),
		},
		Log: Log{
			Level:     l.enum("LOG_LEVEL", "info", "debug", "info", "warn", "error"),
			Format:    l.enum("LOG_FORMAT", "json", "json", "text"),
			AddSource: l.bool("LOG_ADD_SOURCE", false),
		},
		Auth: Auth{
			JWTSecret:            l.str("AUTH_JWT_SECRET", ""),
			JWTIssuer:            l.str("AUTH_JWT_ISSUER", "ryugaware"),
			AccessTokenTTL:       l.duration("AUTH_ACCESS_TOKEN_TTL", 15*time.Minute),
			RefreshTokenTTL:      l.duration("AUTH_REFRESH_TOKEN_TTL", 720*time.Hour),
			BcryptCost:           l.int("AUTH_BCRYPT_COST", 12),
			EmailVerificationTTL: l.duration("AUTH_EMAIL_VERIFICATION_TTL", 48*time.Hour),
			PasswordResetTTL:     l.duration("AUTH_PASSWORD_RESET_TTL", time.Hour),
			MaxActiveSessions:    l.int("AUTH_MAX_ACTIVE_SESSIONS", 10),
			LoginRateLimit:       l.int("AUTH_LOGIN_RATE_LIMIT", 10),
			LoginRateWindow:      l.duration("AUTH_LOGIN_RATE_WINDOW", time.Minute),
			RolesCacheTTL:        l.duration("AUTH_ROLES_CACHE_TTL", 5*time.Minute),
			BootstrapAdminEmail:  l.str("AUTH_BOOTSTRAP_ADMIN_EMAIL", ""),
		},
		Messaging: Messaging{
			Stream:         l.str("EVENTS_STREAM", "ryugaware:events:v1"),
			DLQStream:      l.str("EVENTS_DLQ_STREAM", "ryugaware:events:v1:dlq"),
			MaxLen:         l.int64("EVENTS_STREAM_MAXLEN", 100000),
			LiveChannel:    l.str("EVENTS_LIVE_CHANNEL", "ryugaware:events:live"),
			BatchSize:      l.int64("EVENTS_BATCH_SIZE", 16),
			BlockTimeout:   l.duration("EVENTS_BLOCK_TIMEOUT", 5*time.Second),
			MaxRetries:     l.int64("EVENTS_MAX_RETRIES", 5),
			ClaimMinIdle:   l.duration("EVENTS_CLAIM_MIN_IDLE", 60*time.Second),
			ClaimInterval:  l.duration("EVENTS_CLAIM_INTERVAL", 30*time.Second),
			HandlerTimeout: l.duration("EVENTS_HANDLER_TIMEOUT", 30*time.Second),
			WorkersEnabled: l.bool("EVENTS_WORKERS_ENABLED", true),
		},
	}

	if err := l.err(); err != nil {
		return nil, err
	}
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

// dotenvFiles returns the .env candidates to load, nearest-first.
func dotenvFiles() []string {
	if explicit := os.Getenv("ENV_FILE"); explicit != "" {
		return []string{explicit}
	}
	return []string{".env"}
}
