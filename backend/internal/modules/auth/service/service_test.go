package service

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/ryuga/ryugaware/backend/internal/modules/auth/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/auth/store"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

var fixedNow = time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)

func newTestService(t *testing.T) (*Service, *fakeRepo, *fakeCache, *fakePublisher) {
	t.Helper()
	repo := newFakeRepo()
	cache := newFakeCache()
	pub := &fakePublisher{}

	svc := New(repo, cache, pub, Policy{
		BcryptCost:           bcrypt.MinCost,
		AccessTokenTTL:       15 * time.Minute,
		RefreshTokenTTL:      24 * time.Hour,
		PasswordResetTTL:     time.Hour,
		RegistrationProofTTL: 3 * time.Minute,
		OTPTTL:               5 * time.Minute,
		MaxActiveSessions:    5,
		LoginRateLimit:       10,
		LoginRateWindow:      time.Minute,
		JWTIssuer:            "ryugaware-test",
		TenantKeyCacheTTL:    5 * time.Minute,
		TokenHMACKey:         DeriveTokenKey("test-secret-test-secret-test-secret"),
		PublicBaseURL:        "http://localhost:3000",
	})
	svc.WithClock(func() time.Time { return fixedNow })
	svc.WithGenerators(
		func(n int) (string, error) { return strings.Repeat("a", 8) + "token", nil },
		func() (string, error) { return "004291", nil },
	)
	return svc, repo, cache, pub
}

func seedUser(t *testing.T, svc *Service, repo *fakeRepo, email, password string) (*model.User, *model.Tenant) {
	t.Helper()
	tenant := &model.Tenant{
		ID:             uuid.New(),
		Name:           "Acme",
		PasswordPepper: "pepper-value",
		JWTSecret:      "tenant-signing-secret-" + uuid.NewString(),
		IsActive:       true,
	}
	hash, err := hashPassword(tenant.PasswordPepper, password, bcrypt.MinCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	user := &model.User{
		ID:                uuid.New(),
		TenantID:          tenant.ID,
		RoleID:            model.RoleAdminID,
		FullName:          "Rahul Singh",
		Email:             email,
		PasswordHash:      hash,
		PasswordChangedAt: fixedNow.Add(-time.Hour),
		IsActive:          true,
	}
	repo.tenants[tenant.ID] = tenant
	repo.users[user.ID] = user
	return user, tenant
}

func assertCode(t *testing.T, err error, want apperrors.Code) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected error with code %q, got nil", want)
	}
	if !apperrors.IsCode(err, want) {
		t.Fatalf("error code = %v, want %q", err, want)
	}
}

func TestRequestOTP_BlacklistedEmail(t *testing.T) {
	svc, _, cache, pub := newTestService(t)
	cache.blacklisted = true

	err := svc.RequestOTP(context.Background(), "User@Example.com")

	assertCode(t, err, apperrors.CodeRateLimited)
	if len(pub.events) != 0 {
		t.Errorf("published %v, want no events", pub.typesPublished())
	}
}

func TestRequestOTP_AlreadyRegistered(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	seedUser(t, svc, repo, "user@example.com", "Password123")

	err := svc.RequestOTP(context.Background(), " USER@example.com ")

	assertCode(t, err, apperrors.CodeEmailAlreadyRegistered)
}

func TestRequestOTP_CooldownSkipsNewCode(t *testing.T) {
	svc, _, cache, pub := newTestService(t)
	cache.cooldown = true

	if err := svc.RequestOTP(context.Background(), "new@example.com"); err != nil {
		t.Fatalf("RequestOTP: %v", err)
	}
	if cache.savedOTP != "" {
		t.Error("a new OTP was stored during cooldown")
	}
	if len(pub.events) != 0 {
		t.Errorf("published %v during cooldown", pub.typesPublished())
	}
}

func TestRequestOTP_StoresHashAndQueuesEmail(t *testing.T) {
	svc, _, cache, pub := newTestService(t)

	if err := svc.RequestOTP(context.Background(), "new@example.com"); err != nil {
		t.Fatalf("RequestOTP: %v", err)
	}
	if cache.savedOTP == "004291" || cache.savedOTP == "" {
		t.Fatalf("stored OTP = %q, want a hash", cache.savedOTP)
	}
	if got := pub.typesPublished(); len(got) != 1 || got[0] != EventEmailRequested {
		t.Fatalf("published %v, want one %s", got, EventEmailRequested)
	}
	if pub.events[0].Payload["otp"] != "004291" {
		t.Error("the raw OTP must travel in the notification payload")
	}
}

func TestRequestOTP_NotificationFailureIsReported(t *testing.T) {
	svc, _, _, pub := newTestService(t)
	pub.err = context.DeadlineExceeded

	err := svc.RequestOTP(context.Background(), "new@example.com")

	assertCode(t, err, apperrors.CodeUnavailable)
}

func TestVerifyOTP_Outcomes(t *testing.T) {
	cases := []struct {
		name    string
		outcome store.OTPOutcome
		want    apperrors.Code
	}{
		{"wrong code", store.OTPWrong, apperrors.CodeInvalidOTP},
		{"expired", store.OTPMissing, apperrors.CodeOTPExpired},
		{"locked out", store.OTPLockedOut, apperrors.CodeRateLimited},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			svc, _, cache, _ := newTestService(t)
			cache.otpOutcome = tc.outcome

			_, err := svc.VerifyOTP(context.Background(), "new@example.com", "111111")

			assertCode(t, err, tc.want)
		})
	}
}

func TestVerifyOTP_ReturnsProofAndHashesTheCode(t *testing.T) {
	svc, _, cache, _ := newTestService(t)
	cache.otpOutcome = store.OTPVerified

	token, err := svc.VerifyOTP(context.Background(), "new@example.com", "004291")
	if err != nil {
		t.Fatalf("VerifyOTP: %v", err)
	}
	if token == "" {
		t.Fatal("registration proof is empty")
	}
	if cache.otpHash == "004291" {
		t.Error("the OTP was compared in plaintext")
	}
}

func TestRegister_RequiresVerificationProof(t *testing.T) {
	svc, _, cache, _ := newTestService(t)
	cache.proofResult = store.ProofMissing

	_, err := svc.Register(context.Background(), RegisterInput{
		OrgName: "Ryuga System", FullName: "Rahul", Email: "new@example.com",
		Password: "Password123", RegistrationToken: "token",
	})

	assertCode(t, err, apperrors.CodeEmailVerificationRequired)
}

func TestRegister_RejectsMismatchedProof(t *testing.T) {
	svc, _, cache, _ := newTestService(t)
	cache.proofResult = store.ProofMismatch

	_, err := svc.Register(context.Background(), RegisterInput{
		OrgName: "Ryuga System", FullName: "Rahul", Email: "new@example.com",
		Password: "Password123", RegistrationToken: "wrong",
	})

	assertCode(t, err, apperrors.CodeInvalidRegistrationToken)
}

func TestRegister_RejectsWeakPassword(t *testing.T) {
	svc, _, _, _ := newTestService(t)

	_, err := svc.Register(context.Background(), RegisterInput{
		OrgName: "Ryuga System", FullName: "Rahul", Email: "new@example.com",
		Password: "short", RegistrationToken: "token",
	})

	assertCode(t, err, apperrors.CodeValidation)
}

func TestRegister_DuplicateOrganizationName(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	repo.tenants[uuid.New()] = &model.Tenant{ID: uuid.New(), Name: "Ryuga System", IsActive: true}

	_, err := svc.Register(context.Background(), RegisterInput{
		OrgName: " Ryuga   System ", FullName: "Rahul", Email: "new@example.com",
		Password: "Password123", RegistrationToken: "token",
	})

	assertCode(t, err, apperrors.CodeOrganizationNameTaken)
}

func TestRegister_CreatesTenantUserLicenceAndEvent(t *testing.T) {
	svc, repo, _, _ := newTestService(t)

	result, err := svc.Register(context.Background(), RegisterInput{
		OrgName: "Ryuga System", FullName: "Rahul Singh", Email: " USER@Example.com ",
		Password: "Password123", RegistrationToken: "token",
	})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if result.Email != "user@example.com" {
		t.Errorf("email = %q, want the normalized address", result.Email)
	}
	if len(repo.tenants) != 1 || len(repo.users) != 1 || len(repo.licenses) != 1 {
		t.Fatalf("tenants=%d users=%d licences=%d, want 1 each",
			len(repo.tenants), len(repo.users), len(repo.licenses))
	}

	var user *model.User
	for _, u := range repo.users {
		user = u
	}
	if user.RoleID != model.RoleAdminID {
		t.Errorf("role = %s, want the seeded global admin role", user.RoleID)
	}
	if user.RoleTenantID != nil {
		t.Error("a global role must be assigned with a NULL role_tenant_id")
	}
	if strings.Contains(user.PasswordHash, "Password123") {
		t.Fatal("the password was stored in plaintext")
	}

	licence := repo.licenses[0]
	if licence.MaxWebsites != 1 || licence.StorageLimitBytes != 10*1024*1024*1024 {
		t.Errorf("licence = %+v, want the default plan", licence)
	}
	if !licence.ExpiresAt.Equal(fixedNow.AddDate(1, 0, 0)) {
		t.Errorf("licence expiry = %v, want one year", licence.ExpiresAt)
	}

	events := outboxByType(t, repo)
	if _, ok := events[EventUserRegistered]; !ok {
		t.Fatalf("outbox = %v, want an %s row", outboxTypes(repo), EventUserRegistered)
	}
	welcome, ok := events[EventEmailRequested]
	if !ok {
		t.Fatalf("outbox = %v, want a %s row", outboxTypes(repo), EventEmailRequested)
	}
	for key, want := range map[string]string{
		"template":          "welcome",
		"to":                "user@example.com",
		"name":              "Rahul Singh",
		"organization_name": "Ryuga System",
		"login_url":         "http://localhost:3000/login",
	} {
		if got := welcome[key]; got != want {
			t.Errorf("welcome payload %s = %v, want %q", key, got, want)
		}
	}
	for _, row := range repo.outbox {
		if row.Status != "PENDING" {
			t.Errorf("outbox status = %q, want PENDING", row.Status)
		}
	}
}

func TestRegister_PasswordUsesTenantPepper(t *testing.T) {
	svc, repo, _, _ := newTestService(t)

	if _, err := svc.Register(context.Background(), RegisterInput{
		OrgName: "Ryuga System", FullName: "Rahul", Email: "user@example.com",
		Password: "Password123", RegistrationToken: "token",
	}); err != nil {
		t.Fatalf("Register: %v", err)
	}

	var user *model.User
	for _, u := range repo.users {
		user = u
	}
	tenant := repo.tenants[user.TenantID]

	if !verifyPassword(tenant.PasswordPepper, "Password123", user.PasswordHash) {
		t.Error("the stored hash does not verify with the tenant pepper")
	}
	if verifyPassword("other-pepper", "Password123", user.PasswordHash) {
		t.Error("the hash verifies without the tenant pepper")
	}
}

func TestLogin_UnknownUserIsGeneric(t *testing.T) {
	svc, _, _, pub := newTestService(t)

	_, err := svc.Login(context.Background(), "nobody@example.com", "Password123", "10.0.0.1")

	assertCode(t, err, apperrors.CodeUnauthorized)
	if got := pub.typesPublished(); len(got) != 1 || got[0] != EventLoginFailed {
		t.Errorf("published %v, want %s", got, EventLoginFailed)
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	seedUser(t, svc, repo, "user@example.com", "Password123")

	_, err := svc.Login(context.Background(), "user@example.com", "WrongPassword1", "10.0.0.1")

	assertCode(t, err, apperrors.CodeUnauthorized)
}

func TestLogin_InactiveTenantIsForbidden(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	_, tenant := seedUser(t, svc, repo, "user@example.com", "Password123")
	tenant.IsActive = false

	_, err := svc.Login(context.Background(), "user@example.com", "Password123", "10.0.0.1")

	assertCode(t, err, apperrors.CodeForbidden)
}

func TestLogin_RateLimited(t *testing.T) {
	svc, repo, cache, _ := newTestService(t)
	seedUser(t, svc, repo, "user@example.com", "Password123")
	cache.allow = false

	_, err := svc.Login(context.Background(), "user@example.com", "Password123", "10.0.0.1")

	assertCode(t, err, apperrors.CodeRateLimited)
}

func TestLogin_IssuesSessionAndTouchesLastLogin(t *testing.T) {
	svc, repo, cache, pub := newTestService(t)
	user, _ := seedUser(t, svc, repo, "user@example.com", "Password123")

	result, err := svc.Login(context.Background(), " User@Example.com ", "Password123", "10.0.0.1")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}
	if result.Tokens.AccessToken == "" || result.Tokens.RefreshToken == "" {
		t.Fatal("login did not issue both tokens")
	}
	if !strings.HasPrefix(result.Tokens.RefreshToken, result.Tokens.SessionID+".") {
		t.Error("the refresh token does not carry its session id")
	}
	if len(cache.sessions) != 1 {
		t.Errorf("sessions stored = %d, want 1", len(cache.sessions))
	}
	for _, sess := range cache.sessions {
		if strings.Contains(result.Tokens.RefreshToken, sess.RefreshHash) {
			t.Error("the refresh token secret was stored unhashed")
		}
	}
	if cache.limitCalls != 1 {
		t.Error("the active session limit was not enforced")
	}
	if repo.users[user.ID].LastLoginAt == nil {
		t.Error("last_login_at was not updated")
	}
	if got := pub.typesPublished(); len(got) != 1 || got[0] != EventUserLoggedIn {
		t.Errorf("published %v, want %s", got, EventUserLoggedIn)
	}
}

func TestAuthenticate_RejectsTokenIssuedBeforePasswordChange(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	user, tenant := seedUser(t, svc, repo, "user@example.com", "Password123")

	token, _, _, err := svc.issueAccessToken(user.ID, user.TenantID, tenant.JWTSecret, "session-1")
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}
	if _, err := svc.Authenticate(context.Background(), token); err != nil {
		t.Fatalf("Authenticate: %v", err)
	}

	user.PasswordChangedAt = fixedNow.Add(time.Minute)

	_, err = svc.Authenticate(context.Background(), token)
	assertCode(t, err, apperrors.CodeUnauthorized)
}

func TestAuthenticate_RejectsDenylistedToken(t *testing.T) {
	svc, repo, cache, _ := newTestService(t)
	user, tenant := seedUser(t, svc, repo, "user@example.com", "Password123")

	token, jti, _, err := svc.issueAccessToken(user.ID, user.TenantID, tenant.JWTSecret, "session-1")
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}
	cache.denylisted[jti] = true

	_, err = svc.Authenticate(context.Background(), token)
	assertCode(t, err, apperrors.CodeUnauthorized)
}

func TestAuthenticate_RejectsForeignSignature(t *testing.T) {
	svc, repo, cache, _ := newTestService(t)
	user, tenant := seedUser(t, svc, repo, "user@example.com", "Password123")

	token, _, _, err := svc.issueAccessToken(user.ID, user.TenantID, tenant.JWTSecret, "session-1")
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}
	tenant.JWTSecret = "a-completely-different-secret-value"
	delete(cache.signingKeys, tenant.ID.String())

	_, err = svc.Authenticate(context.Background(), token)
	assertCode(t, err, apperrors.CodeUnauthorized)
}

func TestRefresh_ReuseRevokesEverySession(t *testing.T) {
	svc, repo, cache, _ := newTestService(t)
	user, _ := seedUser(t, svc, repo, "user@example.com", "Password123")

	result, err := svc.Login(context.Background(), "user@example.com", "Password123", "10.0.0.1")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}
	cache.rotate = store.RotateReuseDetected

	_, err = svc.Refresh(context.Background(), result.Tokens.RefreshToken)

	assertCode(t, err, apperrors.CodeUnauthorized)
	if len(cache.revoked) != 1 || cache.revoked[0] != user.ID.String() {
		t.Errorf("revoked sessions for %v, want the token owner", cache.revoked)
	}
}

func TestRefresh_MalformedTokenIsUnauthorized(t *testing.T) {
	svc, _, _, _ := newTestService(t)

	_, err := svc.Refresh(context.Background(), "no-separator")

	assertCode(t, err, apperrors.CodeUnauthorized)
}

func TestForgotPassword_UnknownEmailStaysSilent(t *testing.T) {
	svc, _, cache, pub := newTestService(t)

	if err := svc.ForgotPassword(context.Background(), "nobody@example.com", "10.0.0.1"); err != nil {
		t.Fatalf("ForgotPassword: %v", err)
	}
	if len(pub.events) != 0 {
		t.Errorf("published %v for an unknown address", pub.typesPublished())
	}
	if len(cache.resets) != 0 {
		t.Error("a reset token was stored for an unknown address")
	}
}

func TestForgotPassword_StoresHashedTokenAndQueuesEmail(t *testing.T) {
	svc, repo, cache, pub := newTestService(t)
	seedUser(t, svc, repo, "user@example.com", "Password123")

	if err := svc.ForgotPassword(context.Background(), "user@example.com", "10.0.0.1"); err != nil {
		t.Fatalf("ForgotPassword: %v", err)
	}
	if len(cache.resets) != 1 {
		t.Fatalf("stored %d reset records, want 1", len(cache.resets))
	}
	for hash := range cache.resets {
		if strings.Contains(hash, "token") {
			t.Error("the reset token was stored unhashed")
		}
	}
	types := pub.typesPublished()
	if len(types) != 2 || types[0] != EventEmailRequested || types[1] != EventPasswordResetRequested {
		t.Errorf("published %v", types)
	}
}

func TestResetPassword_UnknownTokenRejected(t *testing.T) {
	svc, _, _, _ := newTestService(t)

	err := svc.ResetPassword(context.Background(), "missing-token", "NewPassword123")

	assertCode(t, err, apperrors.CodeBadRequest)
}

func TestResetPassword_UpdatesHashAndRevokesSessions(t *testing.T) {
	svc, repo, cache, _ := newTestService(t)
	user, tenant := seedUser(t, svc, repo, "user@example.com", "Password123")
	oldHash := user.PasswordHash

	if err := svc.ForgotPassword(context.Background(), "user@example.com", "10.0.0.1"); err != nil {
		t.Fatalf("ForgotPassword: %v", err)
	}
	var rawToken string
	for hash := range cache.resets {
		if hash == svc.hashToken("aaaaaaaatoken") {
			rawToken = "aaaaaaaatoken"
		}
	}
	if rawToken == "" {
		t.Fatal("could not recover the generated reset token")
	}

	if err := svc.ResetPassword(context.Background(), rawToken, "NewPassword123"); err != nil {
		t.Fatalf("ResetPassword: %v", err)
	}

	updated := repo.users[user.ID]
	if updated.PasswordHash == oldHash {
		t.Error("the password hash did not change")
	}
	if !verifyPassword(tenant.PasswordPepper, "NewPassword123", updated.PasswordHash) {
		t.Error("the new password does not verify")
	}
	if !updated.PasswordChangedAt.Equal(fixedNow) {
		t.Error("password_changed_at was not bumped")
	}
	if len(cache.revoked) != 1 {
		t.Error("sessions were not revoked after the reset")
	}
	if len(cache.resets) != 0 {
		t.Error("the reset token was not consumed")
	}
	events := outboxByType(t, repo)
	if _, ok := events[EventPasswordChanged]; !ok {
		t.Errorf("outbox = %v, want an %s row", outboxTypes(repo), EventPasswordChanged)
	}
	notice, ok := events[EventEmailRequested]
	if !ok {
		t.Fatalf("outbox = %v, want a %s row", outboxTypes(repo), EventEmailRequested)
	}
	if notice["template"] != "password_changed" || notice["to"] != "user@example.com" {
		t.Errorf("password-changed email payload = %v", notice)
	}
}

func TestChangePassword_WrongCurrentPassword(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	user, _ := seedUser(t, svc, repo, "user@example.com", "Password123")

	err := svc.ChangePassword(context.Background(),
		&Principal{UserID: user.ID, TenantID: user.TenantID}, "WrongPassword1", "NewPassword123")

	assertCode(t, err, apperrors.CodeUnauthorized)
}

func TestChangePassword_RejectsReuseOfCurrentPassword(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	user, _ := seedUser(t, svc, repo, "user@example.com", "Password123")

	err := svc.ChangePassword(context.Background(),
		&Principal{UserID: user.ID, TenantID: user.TenantID}, "Password123", "Password123")

	assertCode(t, err, apperrors.CodeValidation)
}

func TestChangePassword_UpdatesAndRevokes(t *testing.T) {
	svc, repo, cache, _ := newTestService(t)
	user, tenant := seedUser(t, svc, repo, "user@example.com", "Password123")

	err := svc.ChangePassword(context.Background(),
		&Principal{UserID: user.ID, TenantID: user.TenantID}, "Password123", "NewPassword123")
	if err != nil {
		t.Fatalf("ChangePassword: %v", err)
	}
	if !verifyPassword(tenant.PasswordPepper, "NewPassword123", repo.users[user.ID].PasswordHash) {
		t.Error("the new password does not verify")
	}
	if len(cache.revoked) != 1 {
		t.Error("sessions were not revoked after the change")
	}
}

func TestEnsurePlatformAdmin_CreatesOnceInPlatformTenant(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	repo.tenants[model.PlatformTenantID] = &model.Tenant{
		ID: model.PlatformTenantID, Name: "Ryugaware",
		PasswordPepper: "platform-pepper", IsActive: true, IsPlatform: true,
	}

	created, err := svc.EnsurePlatformAdmin(context.Background(), "root@ryugaware.test", "Password123", "Super admin")
	if err != nil {
		t.Fatalf("EnsurePlatformAdmin: %v", err)
	}
	if !created {
		t.Fatal("the platform admin was not created")
	}

	var user *model.User
	for _, u := range repo.users {
		user = u
	}
	if user.TenantID != model.PlatformTenantID || user.RoleID != model.RoleSuperAdminID {
		t.Errorf("user = %+v, want the platform tenant and super admin role", user)
	}

	again, err := svc.EnsurePlatformAdmin(context.Background(), "root@ryugaware.test", "Password123", "Super admin")
	if err != nil {
		t.Fatalf("second EnsurePlatformAdmin: %v", err)
	}
	if again {
		t.Error("the platform admin was created twice")
	}
}

func TestLogin_NormalizesWhitespaceAroundEmail(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	seedUser(t, svc, repo, "user@example.com", "Password123")

	if _, err := svc.Login(context.Background(), "\tUser@Example.com ", "Password123", "10.0.0.1"); err != nil {
		t.Fatalf("Login with surrounding whitespace: %v", err)
	}
}

func TestLogin_MalformedEmailIsValidationError(t *testing.T) {
	svc, _, _, _ := newTestService(t)

	_, err := svc.Login(context.Background(), "not-an-email", "Password123", "10.0.0.1")

	assertCode(t, err, apperrors.CodeValidation)
}

func TestRequestOTP_MalformedEmailIsValidationError(t *testing.T) {
	svc, _, _, _ := newTestService(t)

	err := svc.RequestOTP(context.Background(), "nope@nodot")

	assertCode(t, err, apperrors.CodeValidation)
}

func TestAuthenticate_RejectsTokenSignedWithAnotherTenantsKey(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	victim, victimTenant := seedUser(t, svc, repo, "victim@example.com", "Password123")
	_, attackerTenant := seedUser(t, svc, repo, "attacker@example.com", "Password123")

	forged, _, _, err := svc.issueAccessToken(victim.ID, victimTenant.ID, attackerTenant.JWTSecret, "session-1")
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	_, err = svc.Authenticate(context.Background(), forged)

	assertCode(t, err, apperrors.CodeUnauthorized)
}

func TestAuthenticate_RejectsUnknownTenantAndCachesTheMiss(t *testing.T) {
	svc, repo, cache, _ := newTestService(t)
	user, _ := seedUser(t, svc, repo, "user@example.com", "Password123")
	ghost := uuid.New()

	token, _, _, err := svc.issueAccessToken(user.ID, ghost, "whatever-secret", "session-1")
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	if _, err := svc.Authenticate(context.Background(), token); !apperrors.IsCode(err, apperrors.CodeUnauthorized) {
		t.Fatalf("error = %v, want unauthorized", err)
	}
	if cached, ok := cache.signingKeys[ghost.String()]; !ok || cached != "" {
		t.Error("an unknown tenant should cache a negative lookup, so random ids cannot hammer Postgres")
	}
}

func TestAuthenticate_CachesTheTenantSigningKey(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	user, tenant := seedUser(t, svc, repo, "user@example.com", "Password123")

	token, _, _, err := svc.issueAccessToken(user.ID, user.TenantID, tenant.JWTSecret, "session-1")
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	if _, err := svc.Authenticate(context.Background(), token); err != nil {
		t.Fatalf("first Authenticate: %v", err)
	}
	afterFirst := repo.tenantLookups

	if _, err := svc.Authenticate(context.Background(), token); err != nil {
		t.Fatalf("second Authenticate: %v", err)
	}

	// The second call still loads the tenant for the active check, but not for the key.
	if repo.tenantLookups-afterFirst > 1 {
		t.Errorf("tenant lookups grew by %d, want at most 1 (the key must come from cache)", repo.tenantLookups-afterFirst)
	}
}

func TestAuthenticate_RejectsInactiveTenantKey(t *testing.T) {
	svc, repo, cache, _ := newTestService(t)
	user, tenant := seedUser(t, svc, repo, "user@example.com", "Password123")

	token, _, _, err := svc.issueAccessToken(user.ID, user.TenantID, tenant.JWTSecret, "session-1")
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}
	tenant.IsActive = false
	delete(cache.signingKeys, tenant.ID.String())

	_, err = svc.Authenticate(context.Background(), token)

	assertCode(t, err, apperrors.CodeUnauthorized)
}

func TestAuthenticate_RejectsTokenForAnotherAudience(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	user, tenant := seedUser(t, svc, repo, "user@example.com", "Password123")

	storefront := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.String(),
			Issuer:    svc.policy.JWTIssuer,
			Audience:  jwt.ClaimStrings{"ryugaware-storefront"},
			ID:        uuid.NewString(),
			IssuedAt:  jwt.NewNumericDate(fixedNow),
			ExpiresAt: jwt.NewNumericDate(fixedNow.Add(time.Hour)),
		},
		TenantID:  tenant.ID.String(),
		SessionID: "session-1",
	})
	signed, err := storefront.SignedString(deriveDashboardKey(tenant.JWTSecret))
	if err != nil {
		t.Fatalf("sign storefront token: %v", err)
	}

	_, err = svc.Authenticate(context.Background(), signed)

	assertCode(t, err, apperrors.CodeUnauthorized)
}

func TestLogin_SignsWithTheTenantKey(t *testing.T) {
	svc, repo, _, _ := newTestService(t)
	_, tenant := seedUser(t, svc, repo, "user@example.com", "Password123")

	result, err := svc.Login(context.Background(), "user@example.com", "Password123", "10.0.0.1")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}

	claims := &Claims{}
	if _, err := jwt.ParseWithClaims(result.Tokens.AccessToken, claims, func(*jwt.Token) (any, error) {
		return deriveDashboardKey(tenant.JWTSecret), nil
	}, jwt.WithTimeFunc(svc.now)); err != nil {
		t.Fatalf("the access token does not verify with the tenant key: %v", err)
	}
	if claims.TenantID != tenant.ID.String() {
		t.Errorf("tenant_id claim = %q, want %q", claims.TenantID, tenant.ID)
	}

	wrongKey := deriveDashboardKey("some-other-tenant-secret")
	if _, err := jwt.ParseWithClaims(result.Tokens.AccessToken, &Claims{}, func(*jwt.Token) (any, error) {
		return wrongKey, nil
	}, jwt.WithTimeFunc(svc.now)); err == nil {
		t.Error("the access token verified with another tenant's key")
	}
}

func outboxByType(t *testing.T, repo *fakeRepo) map[string]map[string]any {
	t.Helper()
	out := make(map[string]map[string]any, len(repo.outbox))
	for _, row := range repo.outbox {
		payload := map[string]any{}
		if err := json.Unmarshal(row.Payload, &payload); err != nil {
			t.Fatalf("outbox payload for %s is not json: %v", row.EventType, err)
		}
		out[row.EventType] = payload
	}
	return out
}

func outboxTypes(repo *fakeRepo) []string {
	types := make([]string, 0, len(repo.outbox))
	for _, row := range repo.outbox {
		types = append(types, row.EventType)
	}
	return types
}
