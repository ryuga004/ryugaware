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

const (
	EnvDevelopment = "development"
	EnvTest        = "test"
	EnvStaging     = "staging"
	EnvProduction  = "production"
)

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

type App struct {
	Name            string
	Env             string
	Version         string
	ShutdownTimeout time.Duration

	PublicBaseURL string
}

func (a App) IsProduction() bool { return a.Env == EnvProduction }

func (a App) IsDevelopment() bool { return a.Env == EnvDevelopment }

type HTTP struct {
	Host              string
	Port              int
	ReadTimeout       time.Duration
	ReadHeaderTimeout time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	MaxHeaderBytes    int

	TrustedProxies []string

	BodyLimitBytes int64
	CORS           CORS
}

func (h HTTP) Addr() string { return fmt.Sprintf("%s:%d", h.Host, h.Port) }

type CORS struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	ExposedHeaders   []string
	AllowCredentials bool
	MaxAge           time.Duration
}

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

	SlowThreshold time.Duration

	StatementTimeout time.Duration
}

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

type Redis struct {
	Addr         string
	Password     string
	DB           int
	PoolSize     int
	MinIdleConns int
	DialTimeout  time.Duration
	ReadTimeout  time.Duration
	WriteTimeout time.Duration

	KeyPrefix string
}

type Storage struct {
	Provider  string
	Region    string
	Bucket    string
	Endpoint  string
	AccessKey string
	SecretKey string

	PublicEndpoint string
	UsePathStyle   bool
	PresignExpiry  time.Duration
	MaxUploadBytes int64
	AllowedMIME    []string
}

func (s Storage) IsMinIO() bool { return s.Provider == "minio" }

const (
	SMTPTLSNone     = "none"
	SMTPTLSSTARTTLS = "starttls"
	SMTPTLSImplicit = "tls"
)

type SMTP struct {
	Host        string
	Port        int
	Username    string
	Password    string
	FromAddress string
	FromName    string

	TLSMode string

	InsecureSkipVerify bool
	Timeout            time.Duration
}

func (s SMTP) Addr() string { return fmt.Sprintf("%s:%d", s.Host, s.Port) }

type Log struct {
	Level string

	Format    string
	AddSource bool
}

type Auth struct {
	TokenHMACSecret      string
	JWTIssuer            string
	AccessTokenTTL       time.Duration
	RefreshTokenTTL      time.Duration
	BcryptCost           int
	EmailVerificationTTL time.Duration
	PasswordResetTTL     time.Duration

	OTPTTL               time.Duration
	OTPMaxAttempts       int
	OTPResendCooldown    time.Duration
	OTPBlacklistTTL      time.Duration
	RegistrationProofTTL time.Duration

	CookieDomain string

	MaxActiveSessions int

	LoginRateLimit  int
	LoginRateWindow time.Duration

	RolesCacheTTL     time.Duration
	TenantKeyCacheTTL time.Duration

	BootstrapAdminEmail    string
	BootstrapAdminPassword string
	BootstrapAdminName     string
}

type Messaging struct {
	Stream    string
	DLQStream string

	MaxLen int64

	LiveChannel string

	BatchSize     int64
	BlockTimeout  time.Duration
	MaxRetries    int64
	ClaimMinIdle  time.Duration
	ClaimInterval time.Duration

	HandlerTimeout time.Duration

	WorkersEnabled bool
}

func Load() (*Config, error) {

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
			TokenHMACSecret:        l.str("AUTH_TOKEN_HMAC_SECRET", ""),
			JWTIssuer:              l.str("AUTH_JWT_ISSUER", "ryugaware"),
			AccessTokenTTL:         l.duration("AUTH_ACCESS_TOKEN_TTL", 15*time.Minute),
			RefreshTokenTTL:        l.duration("AUTH_REFRESH_TOKEN_TTL", 720*time.Hour),
			BcryptCost:             l.int("AUTH_BCRYPT_COST", 12),
			EmailVerificationTTL:   l.duration("AUTH_EMAIL_VERIFICATION_TTL", 48*time.Hour),
			PasswordResetTTL:       l.duration("AUTH_PASSWORD_RESET_TTL", time.Hour),
			MaxActiveSessions:      l.int("AUTH_MAX_ACTIVE_SESSIONS", 10),
			LoginRateLimit:         l.int("AUTH_LOGIN_RATE_LIMIT", 10),
			LoginRateWindow:        l.duration("AUTH_LOGIN_RATE_WINDOW", time.Minute),
			RolesCacheTTL:          l.duration("AUTH_ROLES_CACHE_TTL", 5*time.Minute),
			TenantKeyCacheTTL:      l.duration("AUTH_TENANT_KEY_CACHE_TTL", 5*time.Minute),
			OTPTTL:                 l.duration("AUTH_OTP_TTL", 5*time.Minute),
			OTPMaxAttempts:         l.int("AUTH_OTP_MAX_ATTEMPTS", 3),
			OTPResendCooldown:      l.duration("AUTH_OTP_RESEND_COOLDOWN", time.Minute),
			OTPBlacklistTTL:        l.duration("AUTH_OTP_BLACKLIST_TTL", 30*time.Minute),
			RegistrationProofTTL:   l.duration("AUTH_REGISTRATION_PROOF_TTL", 3*time.Minute),
			CookieDomain:           l.str("AUTH_COOKIE_DOMAIN", ""),
			BootstrapAdminEmail:    l.str("AUTH_BOOTSTRAP_ADMIN_EMAIL", ""),
			BootstrapAdminPassword: l.str("AUTH_BOOTSTRAP_ADMIN_PASSWORD", ""),
			BootstrapAdminName:     l.str("AUTH_BOOTSTRAP_ADMIN_NAME", "Super admin"),
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

func dotenvFiles() []string {
	if explicit := os.Getenv("ENV_FILE"); explicit != "" {
		return []string{explicit}
	}
	return []string{".env"}
}
