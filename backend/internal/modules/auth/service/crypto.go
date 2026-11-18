package service

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const (
	otpDigits       = 6
	tokenBytes      = 32
	sessionIDBytes  = 16
	refreshSepartor = "."
)

func DeriveTokenKey(secret string) []byte {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte("ryugaware:token-hash:v1"))
	return mac.Sum(nil)
}

func deriveDashboardKey(tenantSecret string) []byte {
	mac := hmac.New(sha256.New, []byte(tenantSecret))
	mac.Write([]byte("ryugaware:dashboard-token:v1"))
	return mac.Sum(nil)
}

func randomToken(n int) (string, error) {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("auth: random token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func randomOTP() (string, error) {
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("auth: random otp: %w", err)
	}
	return fmt.Sprintf("%0*d", otpDigits, n.Int64()), nil
}

func randomPepper() (string, error) {
	buf := make([]byte, tokenBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("auth: random pepper: %w", err)
	}
	return hex.EncodeToString(buf), nil
}

func (s *Service) hashToken(token string) string {
	mac := hmac.New(sha256.New, s.policy.TokenHMACKey)
	mac.Write([]byte(token))
	return hex.EncodeToString(mac.Sum(nil))
}

func constantTimeEqual(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

func pepperPassword(pepper, password string) []byte {
	mac := hmac.New(sha256.New, []byte(pepper))
	mac.Write([]byte(password))
	return []byte(base64.RawStdEncoding.EncodeToString(mac.Sum(nil)))
}

func hashPassword(pepper, password string, cost int) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword(pepperPassword(pepper, password), cost)
	if err != nil {
		return "", fmt.Errorf("auth: hash password: %w", err)
	}
	return string(hashed), nil
}

func verifyPassword(pepper, password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), pepperPassword(pepper, password)) == nil
}

func (s *Service) burnPasswordTime(password string) {
	_ = bcrypt.CompareHashAndPassword([]byte(s.dummyHash), pepperPassword("", password))
}

func newRefreshToken(sessionID, secret string) string {
	return sessionID + refreshSepartor + secret
}

func splitRefreshToken(token string) (sessionID, secret string, ok bool) {
	parts := strings.SplitN(token, refreshSepartor, 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}
	return parts[0], parts[1], true
}

func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func NormalizeOrgName(name string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(name)), " ")
}
