package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth/repository"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth/store"
)

type Repo interface {
	InTransaction(ctx context.Context, fn func(tx repository.Tx) error) error
	TenantExistsByName(ctx context.Context, name string) (bool, error)
	CreateTenant(ctx context.Context, tx repository.Tx, t *model.Tenant) error
	GetTenant(ctx context.Context, id uuid.UUID) (*model.Tenant, error)
	UserExistsByEmail(ctx context.Context, email string) (bool, error)
	GetUserByEmail(ctx context.Context, email string) (*model.User, error)
	GetUser(ctx context.Context, tenantID, id uuid.UUID) (*model.User, error)
	CreateUser(ctx context.Context, tx repository.Tx, u *model.User) error
	TouchLastLogin(ctx context.Context, tenantID, id uuid.UUID, at time.Time) error
	UpdatePassword(ctx context.Context, tx repository.Tx, tenantID, id uuid.UUID, hash string, at time.Time) error
	GetGlobalRole(ctx context.Context, roleType string) (*model.Role, error)
	GetRole(ctx context.Context, id uuid.UUID) (*model.Role, error)
	PrivilegeNames(ctx context.Context, roleID uuid.UUID) ([]string, error)
	GetLicense(ctx context.Context, tenantID uuid.UUID) (*model.License, error)
	CreateLicense(ctx context.Context, tx repository.Tx, l *model.License) error
	AppendOutbox(ctx context.Context, tx repository.Tx, e *model.OutboxEvent) error
}

type Cache interface {
	SaveOTP(ctx context.Context, email, otpHash string) error
	HasActiveOTP(ctx context.Context, email string) (bool, error)
	OnResendCooldown(ctx context.Context, email string) (bool, error)
	IsBlacklisted(ctx context.Context, email string) (bool, error)
	VerifyOTP(ctx context.Context, email, otpHash, proofHash string) (store.OTPOutcome, error)
	ConsumeRegistrationProof(ctx context.Context, email, proofHash string) (store.ProofOutcome, error)
	SaveSession(ctx context.Context, sess store.Session) error
	GetSession(ctx context.Context, sessionID string) (*store.Session, error)
	RotateSession(ctx context.Context, sessionID, oldHash, newHash string) (store.RotateOutcome, error)
	DeleteSession(ctx context.Context, userID, sessionID string) error
	RevokeUserSessions(ctx context.Context, userID string) error
	EnforceSessionLimit(ctx context.Context, userID string, max int) error
	DenylistAccessToken(ctx context.Context, jti string, ttl time.Duration) error
	IsAccessTokenDenylisted(ctx context.Context, jti string) (bool, error)
	SavePasswordReset(ctx context.Context, tokenHash string, rec store.ResetRecord, ttl time.Duration) error
	GetPasswordReset(ctx context.Context, tokenHash string) (*store.ResetRecord, error)
	ConsumePasswordReset(ctx context.Context, tokenHash string) (*store.ResetRecord, error)
	GetTenantSigningKey(ctx context.Context, tenantID string) (string, bool, error)
	SetTenantSigningKey(ctx context.Context, tenantID, key string, ttl time.Duration) error
	InvalidateTenantSigningKey(ctx context.Context, tenantID string) error
	Allow(ctx context.Context, scope, identifier string, limit int, window time.Duration) (bool, error)
	ResetAttempts(ctx context.Context, scope, identifier string) error
}

type Event struct {
	Type        string
	TenantID    *uuid.UUID
	AggregateID *uuid.UUID
	Payload     map[string]any
}

type Publisher interface {
	Publish(ctx context.Context, evt Event) error
}

type Policy struct {
	BcryptCost           int
	AccessTokenTTL       time.Duration
	RefreshTokenTTL      time.Duration
	PasswordResetTTL     time.Duration
	RegistrationProofTTL time.Duration
	OTPTTL               time.Duration
	MaxActiveSessions    int
	LoginRateLimit       int
	LoginRateWindow      time.Duration
	JWTIssuer            string
	TenantKeyCacheTTL    time.Duration
	TokenHMACKey         []byte
	PublicBaseURL        string
}

// WebsiteCounter is satisfied by the websites module, which owns the websites table. Declared here
// because the licence lives in auth, so auth is the consumer that needs the count.
type WebsiteCounter interface {
	CountForTenant(ctx context.Context, tenantID uuid.UUID) (int64, error)
}

type Service struct {
	repo      Repo
	websites  WebsiteCounter
	cache     Cache
	events    Publisher
	policy    Policy
	now       func() time.Time
	randToken func(int) (string, error)
	randOTP   func() (string, error)
	dummyHash string
}

func New(repo Repo, cache Cache, events Publisher, policy Policy) *Service {
	dummy, err := bcrypt.GenerateFromPassword([]byte("ryugaware-dummy-comparison"), policy.BcryptCost)
	if err != nil {
		dummy = []byte("$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv")
	}
	return &Service{
		repo:      repo,
		cache:     cache,
		events:    events,
		policy:    policy,
		now:       time.Now,
		randToken: randomToken,
		randOTP:   randomOTP,
		dummyHash: string(dummy),
	}
}

// WithWebsiteCounter is set after construction because websites is wired after auth.
func (s *Service) WithWebsiteCounter(counter WebsiteCounter) *Service {
	s.websites = counter
	return s
}

func (s *Service) WithClock(now func() time.Time) *Service {
	s.now = now
	return s
}

func (s *Service) WithGenerators(token func(int) (string, error), otp func() (string, error)) *Service {
	s.randToken = token
	s.randOTP = otp
	return s
}
