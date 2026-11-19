package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth/repository"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth/store"
)

type fakeRepo struct {
	tenants       map[uuid.UUID]*model.Tenant
	users         map[uuid.UUID]*model.User
	roles         map[string]*model.Role
	licenses      []*model.License
	outbox        []*model.OutboxEvent
	failTx        error
	lastLog       *time.Time
	tenantLookups int
}

func newFakeRepo() *fakeRepo {
	adminID := model.RoleAdminID
	return &fakeRepo{
		tenants: map[uuid.UUID]*model.Tenant{},
		users:   map[uuid.UUID]*model.User{},
		roles: map[string]*model.Role{
			"admin":       {ID: adminID, Name: "Admin", Type: "admin"},
			"super_admin": {ID: model.RoleSuperAdminID, Name: "Super admin", Type: "super_admin"},
		},
	}
}

func (f *fakeRepo) InTransaction(ctx context.Context, fn func(tx repository.Tx) error) error {
	if f.failTx != nil {
		return f.failTx
	}
	snapshotTenants := len(f.tenants)
	snapshotUsers := len(f.users)
	if err := fn(repository.Tx{}); err != nil {
		for id := range f.tenants {
			if snapshotTenants == 0 {
				delete(f.tenants, id)
			}
		}
		for id := range f.users {
			if snapshotUsers == 0 {
				delete(f.users, id)
			}
		}
		return err
	}
	return nil
}

func (f *fakeRepo) TenantExistsByName(ctx context.Context, name string) (bool, error) {
	for _, t := range f.tenants {
		if t.Name == name {
			return true, nil
		}
	}
	return false, nil
}

func (f *fakeRepo) CreateTenant(ctx context.Context, tx repository.Tx, t *model.Tenant) error {
	f.tenants[t.ID] = t
	return nil
}

func (f *fakeRepo) GetTenant(ctx context.Context, id uuid.UUID) (*model.Tenant, error) {
	f.tenantLookups++
	return f.tenants[id], nil
}

func (f *fakeRepo) UserExistsByEmail(ctx context.Context, email string) (bool, error) {
	u, _ := f.GetUserByEmail(ctx, email)
	return u != nil, nil
}

func (f *fakeRepo) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	for _, u := range f.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, nil
}

func (f *fakeRepo) GetUser(ctx context.Context, tenantID, id uuid.UUID) (*model.User, error) {
	u, ok := f.users[id]
	if !ok || u.TenantID != tenantID {
		return nil, nil
	}
	return u, nil
}

func (f *fakeRepo) CreateUser(ctx context.Context, tx repository.Tx, u *model.User) error {
	if existing, _ := f.GetUserByEmail(ctx, u.Email); existing != nil {
		return errors.New("duplicate key value violates unique constraint")
	}
	f.users[u.ID] = u
	return nil
}

func (f *fakeRepo) TouchLastLogin(ctx context.Context, tenantID, id uuid.UUID, at time.Time) error {
	u, ok := f.users[id]
	if !ok {
		return errors.New("missing user")
	}
	u.LastLoginAt = &at
	f.lastLog = &at
	return nil
}

func (f *fakeRepo) UpdatePassword(ctx context.Context, tx repository.Tx, tenantID, id uuid.UUID, hash string, at time.Time) error {
	u, ok := f.users[id]
	if !ok || u.TenantID != tenantID {
		return errors.New("missing user")
	}
	u.PasswordHash = hash
	u.PasswordChangedAt = at
	return nil
}

func (f *fakeRepo) GetGlobalRole(ctx context.Context, roleType string) (*model.Role, error) {
	return f.roles[roleType], nil
}

func (f *fakeRepo) GetRole(ctx context.Context, id uuid.UUID) (*model.Role, error) {
	for _, r := range f.roles {
		if r.ID == id {
			return r, nil
		}
	}
	return nil, nil
}

func (f *fakeRepo) PrivilegeNames(ctx context.Context, roleID uuid.UUID) ([]string, error) {
	return []string{"websites.read", "websites.write"}, nil
}

func (f *fakeRepo) GetLicense(ctx context.Context, tenantID uuid.UUID) (*model.License, error) {
	for _, l := range f.licenses {
		if l.TenantID == tenantID {
			return l, nil
		}
	}
	return nil, nil
}

func (f *fakeRepo) CreateLicense(ctx context.Context, tx repository.Tx, l *model.License) error {
	f.licenses = append(f.licenses, l)
	return nil
}

func (f *fakeRepo) AppendOutbox(ctx context.Context, tx repository.Tx, e *model.OutboxEvent) error {
	f.outbox = append(f.outbox, e)
	return nil
}

type fakeCache struct {
	otpHash     string
	otpOutcome  store.OTPOutcome
	proofResult store.ProofOutcome
	blacklisted bool
	cooldown    bool
	activeOTP   bool
	sessions    map[string]*store.Session
	revoked     []string
	denylisted  map[string]bool
	resets      map[string]store.ResetRecord
	rotate      store.RotateOutcome
	allow       bool
	savedOTP    string
	limitCalls  int
	signingKeys map[string]string
	keyLookups  int
	unavailable error
}

func newFakeCache() *fakeCache {
	return &fakeCache{
		proofResult: store.ProofConsumed,
		sessions:    map[string]*store.Session{},
		denylisted:  map[string]bool{},
		resets:      map[string]store.ResetRecord{},
		rotate:      store.RotateOK,
		allow:       true,
		signingKeys: map[string]string{},
	}
}

func (f *fakeCache) SaveOTP(ctx context.Context, email, otpHash string) error {
	f.savedOTP = otpHash
	f.activeOTP = true
	return f.unavailable
}

func (f *fakeCache) HasActiveOTP(ctx context.Context, email string) (bool, error) {
	return f.activeOTP, f.unavailable
}

func (f *fakeCache) OnResendCooldown(ctx context.Context, email string) (bool, error) {
	return f.cooldown, f.unavailable
}

func (f *fakeCache) IsBlacklisted(ctx context.Context, email string) (bool, error) {
	return f.blacklisted, f.unavailable
}

func (f *fakeCache) VerifyOTP(ctx context.Context, email, otpHash, proofHash string) (store.OTPOutcome, error) {
	f.otpHash = otpHash
	return f.otpOutcome, f.unavailable
}

func (f *fakeCache) ConsumeRegistrationProof(ctx context.Context, email, proofHash string) (store.ProofOutcome, error) {
	return f.proofResult, f.unavailable
}

func (f *fakeCache) SaveSession(ctx context.Context, sess store.Session) error {
	f.sessions[sess.SessionID] = &sess
	return f.unavailable
}

func (f *fakeCache) GetSession(ctx context.Context, sessionID string) (*store.Session, error) {
	return f.sessions[sessionID], f.unavailable
}

func (f *fakeCache) RotateSession(ctx context.Context, sessionID, oldHash, newHash string) (store.RotateOutcome, error) {
	return f.rotate, f.unavailable
}

func (f *fakeCache) DeleteSession(ctx context.Context, userID, sessionID string) error {
	delete(f.sessions, sessionID)
	return f.unavailable
}

func (f *fakeCache) RevokeUserSessions(ctx context.Context, userID string) error {
	f.revoked = append(f.revoked, userID)
	return f.unavailable
}

func (f *fakeCache) EnforceSessionLimit(ctx context.Context, userID string, max int) error {
	f.limitCalls++
	return f.unavailable
}

func (f *fakeCache) DenylistAccessToken(ctx context.Context, jti string, ttl time.Duration) error {
	f.denylisted[jti] = true
	return f.unavailable
}

func (f *fakeCache) IsAccessTokenDenylisted(ctx context.Context, jti string) (bool, error) {
	return f.denylisted[jti], f.unavailable
}

func (f *fakeCache) SavePasswordReset(ctx context.Context, tokenHash string, rec store.ResetRecord, ttl time.Duration) error {
	f.resets[tokenHash] = rec
	return f.unavailable
}

func (f *fakeCache) GetPasswordReset(ctx context.Context, tokenHash string) (*store.ResetRecord, error) {
	rec, ok := f.resets[tokenHash]
	if !ok {
		return nil, f.unavailable
	}
	return &rec, f.unavailable
}

func (f *fakeCache) ConsumePasswordReset(ctx context.Context, tokenHash string) (*store.ResetRecord, error) {
	rec, ok := f.resets[tokenHash]
	if !ok {
		return nil, f.unavailable
	}
	delete(f.resets, tokenHash)
	return &rec, f.unavailable
}

func (f *fakeCache) GetTenantSigningKey(ctx context.Context, tenantID string) (string, bool, error) {
	f.keyLookups++
	key, ok := f.signingKeys[tenantID]
	return key, ok, f.unavailable
}

func (f *fakeCache) SetTenantSigningKey(ctx context.Context, tenantID, key string, ttl time.Duration) error {
	f.signingKeys[tenantID] = key
	return f.unavailable
}

func (f *fakeCache) InvalidateTenantSigningKey(ctx context.Context, tenantID string) error {
	delete(f.signingKeys, tenantID)
	return f.unavailable
}

func (f *fakeCache) Allow(ctx context.Context, scope, identifier string, limit int, window time.Duration) (bool, error) {
	return f.allow, f.unavailable
}

func (f *fakeCache) ResetAttempts(ctx context.Context, scope, identifier string) error {
	return f.unavailable
}

type fakePublisher struct {
	events []Event
	err    error
}

func (f *fakePublisher) Publish(ctx context.Context, evt Event) error {
	if f.err != nil {
		return f.err
	}
	f.events = append(f.events, evt)
	return nil
}

func (f *fakePublisher) typesPublished() []string {
	out := make([]string, 0, len(f.events))
	for _, e := range f.events {
		out = append(out, e.Type)
	}
	return out
}
