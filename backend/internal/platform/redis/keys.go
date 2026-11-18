package redis

import (
	"fmt"
	"strings"
)

const (
	nsOTP            = "email-verification:otp"
	nsOTPBlacklist   = "email-verification:blacklist"
	nsOTPVerified    = "email-verification:verified"
	nsOTPCooldown    = "email-verification:cooldown"
	nsRefresh        = "auth:refresh"
	nsUserSessions   = "auth:sessions"
	nsAccessDenylist = "auth:access:blacklist"
	nsPasswordReset  = "auth:password-reset"
	nsRateLimit      = "auth:ratelimit"
	nsTenantKey      = "t"
)

func (c *Client) key(parts ...string) string {
	return c.prefix + ":" + strings.Join(parts, ":")
}

func (c *Client) OTPKey(email string) string { return c.key(nsOTP, email) }

func (c *Client) OTPBlacklistKey(email string) string { return c.key(nsOTPBlacklist, email) }

func (c *Client) VerifiedKey(email string) string { return c.key(nsOTPVerified, email) }

func (c *Client) OTPCooldownKey(email string) string { return c.key(nsOTPCooldown, email) }

func (c *Client) SessionKey(sessionID string) string { return c.key(nsRefresh, sessionID) }

func (c *Client) UserSessionsKey(userID string) string { return c.key(nsUserSessions, userID) }

func (c *Client) AccessDenylistKey(jti string) string { return c.key(nsAccessDenylist, jti) }

func (c *Client) PasswordResetKey(tokenHash string) string {
	return c.key(nsPasswordReset, tokenHash)
}

func (c *Client) RateLimitKey(scope, identifier string) string {
	return c.key(nsRateLimit, scope, identifier)
}

func (c *Client) TenantKey(tenantID string, parts ...string) string {
	return c.key(append([]string{nsTenantKey, tenantID}, parts...)...)
}

func Describe(namespace string, n int) string { return fmt.Sprintf("%s:<%d bytes>", namespace, n) }
