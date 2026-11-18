package store

import (
	"context"
	"fmt"
	"strconv"
	"time"

	goredis "github.com/redis/go-redis/v9"

	"github.com/ryuga/ryugaware/backend/internal/platform/redis"
)

type Config struct {
	OTPTTL               time.Duration
	OTPMaxAttempts       int
	OTPResendCooldown    time.Duration
	OTPBlacklistTTL      time.Duration
	RegistrationProofTTL time.Duration
	RefreshTTL           time.Duration
}

type Store struct {
	rdb *redis.Client
	cfg Config
}

func New(rdb *redis.Client, cfg Config) *Store {
	return &Store{rdb: rdb, cfg: cfg}
}

type OTPOutcome int

const (
	OTPVerified OTPOutcome = iota
	OTPMissing
	OTPWrong
	OTPLockedOut
)

type ProofOutcome int

const (
	ProofConsumed ProofOutcome = iota
	ProofMissing
	ProofMismatch
)

type RotateOutcome int

const (
	RotateOK RotateOutcome = iota
	RotateMissing
	RotateReuseDetected
)

type Session struct {
	SessionID   string
	UserID      string
	TenantID    string
	RefreshHash string
	CreatedAt   time.Time
}

type ResetRecord struct {
	UserID   string
	TenantID string
}

var verifyOTPScript = redis.Script(`
local record = redis.call('HGET', KEYS[1], 'hash')
if not record then
  return {'missing', 0}
end
if record == ARGV[1] then
  redis.call('DEL', KEYS[1])
  redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
  return {'verified', 0}
end
local attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
if attempts >= tonumber(ARGV[4]) then
  redis.call('DEL', KEYS[1])
  redis.call('SET', KEYS[3], '1', 'EX', ARGV[5])
  return {'locked', attempts}
end
return {'wrong', attempts}
`)

var consumeProofScript = redis.Script(`
local stored = redis.call('GET', KEYS[1])
if not stored then
  return 0
end
if stored ~= ARGV[1] then
  return -1
end
redis.call('DEL', KEYS[1])
return 1
`)

var rotateSessionScript = redis.Script(`
local stored = redis.call('HGET', KEYS[1], 'hash')
if not stored then
  return 0
end
if stored ~= ARGV[1] then
  redis.call('DEL', KEYS[1])
  return -1
end
redis.call('HSET', KEYS[1], 'hash', ARGV[2])
redis.call('EXPIRE', KEYS[1], ARGV[3])
return 1
`)

var consumeResetScript = redis.Script(`
local stored = redis.call('HGETALL', KEYS[1])
if #stored == 0 then
  return {}
end
redis.call('DEL', KEYS[1])
return stored
`)

func (s *Store) SaveOTP(ctx context.Context, email, otpHash string) error {
	key := s.rdb.OTPKey(email)
	pipe := s.rdb.Raw().TxPipeline()
	pipe.Del(ctx, key)
	pipe.HSet(ctx, key, "hash", otpHash, "attempts", 0)
	pipe.Expire(ctx, key, redis.TTLFloor(s.cfg.OTPTTL))
	pipe.Set(ctx, s.rdb.OTPCooldownKey(email), "1", redis.TTLFloor(s.cfg.OTPResendCooldown))
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("store: save otp: %w", err)
	}
	return nil
}

func (s *Store) HasActiveOTP(ctx context.Context, email string) (bool, error) {
	n, err := s.rdb.Raw().Exists(ctx, s.rdb.OTPKey(email)).Result()
	if err != nil {
		return false, fmt.Errorf("store: otp exists: %w", err)
	}
	return n > 0, nil
}

func (s *Store) OnResendCooldown(ctx context.Context, email string) (bool, error) {
	n, err := s.rdb.Raw().Exists(ctx, s.rdb.OTPCooldownKey(email)).Result()
	if err != nil {
		return false, fmt.Errorf("store: otp cooldown: %w", err)
	}
	return n > 0, nil
}

func (s *Store) IsBlacklisted(ctx context.Context, email string) (bool, error) {
	n, err := s.rdb.Raw().Exists(ctx, s.rdb.OTPBlacklistKey(email)).Result()
	if err != nil {
		return false, fmt.Errorf("store: otp blacklist: %w", err)
	}
	return n > 0, nil
}

func (s *Store) VerifyOTP(ctx context.Context, email, otpHash, proofHash string) (OTPOutcome, error) {
	res, err := verifyOTPScript.Run(ctx, s.rdb.Raw(),
		[]string{s.rdb.OTPKey(email), s.rdb.VerifiedKey(email), s.rdb.OTPBlacklistKey(email)},
		otpHash,
		proofHash,
		strconv.Itoa(int(redis.TTLFloor(s.cfg.RegistrationProofTTL).Seconds())),
		strconv.Itoa(s.cfg.OTPMaxAttempts),
		strconv.Itoa(int(redis.TTLFloor(s.cfg.OTPBlacklistTTL).Seconds())),
	).Slice()
	if err != nil {
		return OTPMissing, fmt.Errorf("store: verify otp: %w", err)
	}
	if len(res) == 0 {
		return OTPMissing, nil
	}
	switch fmt.Sprint(res[0]) {
	case "verified":
		return OTPVerified, nil
	case "locked":
		return OTPLockedOut, nil
	case "wrong":
		return OTPWrong, nil
	default:
		return OTPMissing, nil
	}
}

func (s *Store) ConsumeRegistrationProof(ctx context.Context, email, proofHash string) (ProofOutcome, error) {
	res, err := consumeProofScript.Run(ctx, s.rdb.Raw(), []string{s.rdb.VerifiedKey(email)}, proofHash).Int()
	if err != nil {
		return ProofMissing, fmt.Errorf("store: consume proof: %w", err)
	}
	switch res {
	case 1:
		return ProofConsumed, nil
	case -1:
		return ProofMismatch, nil
	default:
		return ProofMissing, nil
	}
}

func (s *Store) SaveSession(ctx context.Context, sess Session) error {
	key := s.rdb.SessionKey(sess.SessionID)
	setKey := s.rdb.UserSessionsKey(sess.UserID)
	ttl := redis.TTLFloor(s.cfg.RefreshTTL)

	pipe := s.rdb.Raw().TxPipeline()
	pipe.HSet(ctx, key,
		"hash", sess.RefreshHash,
		"user_id", sess.UserID,
		"tenant_id", sess.TenantID,
		"created_at", sess.CreatedAt.UTC().Format(time.RFC3339),
	)
	pipe.Expire(ctx, key, ttl)
	pipe.ZAdd(ctx, setKey, goredis.Z{Score: float64(sess.CreatedAt.UnixNano()), Member: sess.SessionID})
	pipe.Expire(ctx, setKey, ttl)
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("store: save session: %w", err)
	}
	return nil
}

func (s *Store) GetSession(ctx context.Context, sessionID string) (*Session, error) {
	values, err := s.rdb.Raw().HGetAll(ctx, s.rdb.SessionKey(sessionID)).Result()
	if err != nil {
		return nil, fmt.Errorf("store: get session: %w", err)
	}
	if len(values) == 0 {
		return nil, nil
	}
	created, _ := time.Parse(time.RFC3339, values["created_at"])
	return &Session{
		SessionID:   sessionID,
		UserID:      values["user_id"],
		TenantID:    values["tenant_id"],
		RefreshHash: values["hash"],
		CreatedAt:   created,
	}, nil
}

func (s *Store) RotateSession(ctx context.Context, sessionID, oldHash, newHash string) (RotateOutcome, error) {
	res, err := rotateSessionScript.Run(ctx, s.rdb.Raw(),
		[]string{s.rdb.SessionKey(sessionID)},
		oldHash, newHash, strconv.Itoa(int(redis.TTLFloor(s.cfg.RefreshTTL).Seconds())),
	).Int()
	if err != nil {
		return RotateMissing, fmt.Errorf("store: rotate session: %w", err)
	}
	switch res {
	case 1:
		return RotateOK, nil
	case -1:
		return RotateReuseDetected, nil
	default:
		return RotateMissing, nil
	}
}

func (s *Store) DeleteSession(ctx context.Context, userID, sessionID string) error {
	pipe := s.rdb.Raw().TxPipeline()
	pipe.Del(ctx, s.rdb.SessionKey(sessionID))
	if userID != "" {
		pipe.ZRem(ctx, s.rdb.UserSessionsKey(userID), sessionID)
	}
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("store: delete session: %w", err)
	}
	return nil
}

func (s *Store) RevokeUserSessions(ctx context.Context, userID string) error {
	setKey := s.rdb.UserSessionsKey(userID)
	ids, err := s.rdb.Raw().ZRange(ctx, setKey, 0, -1).Result()
	if err != nil {
		return fmt.Errorf("store: list sessions: %w", err)
	}
	pipe := s.rdb.Raw().TxPipeline()
	for _, id := range ids {
		pipe.Del(ctx, s.rdb.SessionKey(id))
	}
	pipe.Del(ctx, setKey)
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("store: revoke sessions: %w", err)
	}
	return nil
}

func (s *Store) EnforceSessionLimit(ctx context.Context, userID string, max int) error {
	if max <= 0 {
		return nil
	}
	setKey := s.rdb.UserSessionsKey(userID)
	ids, err := s.rdb.Raw().ZRange(ctx, setKey, 0, -1).Result()
	if err != nil {
		return fmt.Errorf("store: session limit: %w", err)
	}
	if len(ids) < max {
		return nil
	}
	evict := ids[:len(ids)-max+1]
	pipe := s.rdb.Raw().TxPipeline()
	for _, id := range evict {
		pipe.Del(ctx, s.rdb.SessionKey(id))
		pipe.ZRem(ctx, setKey, id)
	}
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("store: evict sessions: %w", err)
	}
	return nil
}

func (s *Store) DenylistAccessToken(ctx context.Context, jti string, ttl time.Duration) error {
	if jti == "" || ttl <= 0 {
		return nil
	}
	if err := s.rdb.Raw().Set(ctx, s.rdb.AccessDenylistKey(jti), "1", redis.TTLFloor(ttl)).Err(); err != nil {
		return fmt.Errorf("store: denylist token: %w", err)
	}
	return nil
}

func (s *Store) IsAccessTokenDenylisted(ctx context.Context, jti string) (bool, error) {
	n, err := s.rdb.Raw().Exists(ctx, s.rdb.AccessDenylistKey(jti)).Result()
	if err != nil {
		return false, fmt.Errorf("store: denylist lookup: %w", err)
	}
	return n > 0, nil
}

func (s *Store) SavePasswordReset(ctx context.Context, tokenHash string, rec ResetRecord, ttl time.Duration) error {
	key := s.rdb.PasswordResetKey(tokenHash)
	pipe := s.rdb.Raw().TxPipeline()
	pipe.HSet(ctx, key, "user_id", rec.UserID, "tenant_id", rec.TenantID)
	pipe.Expire(ctx, key, redis.TTLFloor(ttl))
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("store: save reset: %w", err)
	}
	return nil
}

func (s *Store) GetPasswordReset(ctx context.Context, tokenHash string) (*ResetRecord, error) {
	values, err := s.rdb.Raw().HGetAll(ctx, s.rdb.PasswordResetKey(tokenHash)).Result()
	if err != nil {
		return nil, fmt.Errorf("store: get reset: %w", err)
	}
	if len(values) == 0 {
		return nil, nil
	}
	return &ResetRecord{UserID: values["user_id"], TenantID: values["tenant_id"]}, nil
}

func (s *Store) ConsumePasswordReset(ctx context.Context, tokenHash string) (*ResetRecord, error) {
	res, err := consumeResetScript.Run(ctx, s.rdb.Raw(), []string{s.rdb.PasswordResetKey(tokenHash)}).Slice()
	if err != nil {
		return nil, fmt.Errorf("store: consume reset: %w", err)
	}
	if len(res) < 2 {
		return nil, nil
	}
	rec := &ResetRecord{}
	for i := 0; i+1 < len(res); i += 2 {
		switch fmt.Sprint(res[i]) {
		case "user_id":
			rec.UserID = fmt.Sprint(res[i+1])
		case "tenant_id":
			rec.TenantID = fmt.Sprint(res[i+1])
		}
	}
	return rec, nil
}

const tenantKeyMissing = "-"

func (s *Store) GetTenantSigningKey(ctx context.Context, tenantID string) (string, bool, error) {
	value, err := s.rdb.Raw().Get(ctx, s.rdb.TenantKey(tenantID, "signing-key")).Result()
	if redis.Nil(err) {
		return "", false, nil
	}
	if err != nil {
		return "", false, fmt.Errorf("store: tenant signing key: %w", err)
	}
	if value == tenantKeyMissing {
		return "", true, nil
	}
	return value, true, nil
}

func (s *Store) SetTenantSigningKey(ctx context.Context, tenantID, key string, ttl time.Duration) error {
	value := key
	if value == "" {
		value = tenantKeyMissing
		ttl = redis.TTLFloor(ttl / 10)
	}
	if err := s.rdb.Raw().Set(ctx, s.rdb.TenantKey(tenantID, "signing-key"), value, redis.TTLFloor(ttl)).Err(); err != nil {
		return fmt.Errorf("store: cache tenant signing key: %w", err)
	}
	return nil
}

func (s *Store) InvalidateTenantSigningKey(ctx context.Context, tenantID string) error {
	if err := s.rdb.Raw().Del(ctx, s.rdb.TenantKey(tenantID, "signing-key")).Err(); err != nil {
		return fmt.Errorf("store: invalidate tenant signing key: %w", err)
	}
	return nil
}

func (s *Store) Allow(ctx context.Context, scope, identifier string, limit int, window time.Duration) (bool, error) {
	if limit <= 0 {
		return true, nil
	}
	key := s.rdb.RateLimitKey(scope, identifier)
	pipe := s.rdb.Raw().TxPipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, redis.TTLFloor(window))
	if _, err := pipe.Exec(ctx); err != nil {
		return false, fmt.Errorf("store: rate limit: %w", err)
	}
	return incr.Val() <= int64(limit), nil
}

func (s *Store) ResetAttempts(ctx context.Context, scope, identifier string) error {
	if err := s.rdb.Raw().Del(ctx, s.rdb.RateLimitKey(scope, identifier)).Err(); err != nil {
		return fmt.Errorf("store: reset attempts: %w", err)
	}
	return nil
}
