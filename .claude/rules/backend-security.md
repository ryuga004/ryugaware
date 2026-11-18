---
paths:
  - "backend/**/*.go"
---

# Backend security rules

Secure defaults for logging, secrets, request handling and authorization. Tenant isolation is the
separate invariant in `backend-multitenancy.md`; SQL safety is in `backend-persistence.md` §2.

## 1. Logging and PII

- `log/slog` only, structured, through `logger.FromContext(ctx, nil)` so the request id travels with it.
  No `fmt.Println`, no `log.Printf`.
- `internal/platform/logger` already redacts a deny-list of attribute keys (`password`, `token`,
  `access_token`, `refresh_token`, `secret`, `authorization`, `api_key`, `cookie`, …). **That is a safety
  net, not permission to log secrets.**
- For a struct that holds sensitive fields, implement `slog.LogValuer` and return an **allow-list** group
  — new fields then stay hidden by default:

```go
func (u User) LogValue() slog.Value {
    return slog.GroupValue(
        slog.String("user_id", u.ID.String()),
        slog.String("tenant_id", u.TenantID.String()),
    ) // no email, no password_hash, no tokens
}
```

- Never log: request or response bodies wholesale, `Authorization`/`Cookie` headers, passwords, OTPs,
  verification or reset tokens, session ids, JWTs, S3 credentials, SMTP credentials, `jwt_secret`.
- Never log a full e-mail address. Correlate with `user_id`, `tenant_id` and `request_id`.
- Error values are logged, so **secrets must never be put into an error message**. `apperrors.Error`'s
  `Error()` includes its cause — anything you wrap is log output.
- 5xx responses log the full chain (`response.Error` does this); 4xx do not — client mistakes are not
  operator incidents. Authorization denials are logged at `warn` with the ids, even when the client
  sees `404`.

## 2. Startup configuration

- Required security-sensitive values are validated in `config.Validate()` and the process **refuses to
  start** when they are missing or weak. Today that covers `AUTH_JWT_SECRET` presence, bcrypt cost
  range, TTL ordering, and the production rules (short JWT secret, `POSTGRES_SSLMODE=disable`, empty DB
  password, plaintext SMTP, non-S3 storage, non-JSON logs, `CORS *` with credentials).
- A new security-relevant knob ships with its validation rule in the same change.
- No insecure fallback: a missing secret is a startup failure, never a generated default, never a
  hardcoded development value reachable in production.
- Development defaults are allowed only where `App.IsProduction()` is false, and the production branch
  is explicit in `Validate()`.
- Config values are never logged. Log the names of what was loaded, not the values.

## 3. Request protection

- Body limit (`http.MaxBytesReader` from `HTTP_BODY_LIMIT_BYTES`) is applied **before** binding, so an
  oversized payload is rejected without being parsed → `413 payload_too_large`.
- `HTTP_READ_HEADER_TIMEOUT`, `READ_TIMEOUT`, `WRITE_TIMEOUT`, `IDLE_TIMEOUT` and `MAX_HEADER_BYTES` are
  set on the server; a per-request timeout middleware bounds handler work.
- `TrustedProxies` defaults to trusting nobody. Client IP is only trusted for rate limiting when the
  proxy list is configured deliberately.
- Multipart uploads are bounded by `STORAGE_MAX_UPLOAD_BYTES` and checked against `STORAGE_ALLOWED_MIME`
  by sniffing content, not by trusting the declared type or the file extension.
- Malformed input fails as a 4xx, never a panic. The recovery middleware converts a panic into
  `internal_error` and logs it with the request id; it is a backstop, not an error strategy.

## 4. Authentication and authorization

- A JWT's claims are untrusted until `jwt.Parse` has verified the signature **and** the algorithm is the
  expected HMAC one. Reject `alg: none` and any algorithm substitution. Check `iss`, `aud`, `exp`.
- **One narrow exception**: access tokens are signed per tenant, so `tenant_id` is read from the
  unverified token to choose the verification key. Nothing else may be read before verification, the
  value is used only as a cache/database lookup key, it must parse as a UUID, and after verification
  the verified `tenant_id` is compared against the one used for the lookup. An unknown tenant caches a
  negative result so random ids cannot be turned into database load.
- Tokens carry an audience (`ryugaware-dashboard`). A token minted for another audience with the same
  tenant key must not authenticate a dashboard request, which is why the signing key is domain
  separated: `HMAC(tenant.jwt_secret, "ryugaware:dashboard-token:v1")`.
- Three separate middlewares in this order: authenticate (who) → resolve tenant (where) → authorize
  (may they). Never collapse them.
- Roles and privileges are resolved per request through `RoleResolver` (Redis-cached), not read from the
  token — a stale token must not carry stale privileges, and a revoked session must die immediately via
  `SessionChecker`.
- The backend enforces every privilege. A frontend check is a UX affordance and proves nothing.
- Session cookies: `HttpOnly`, `SameSite=Lax` (or `Strict` where it fits), `Secure` whenever
  `App.IsProduction()`, `Path=/`, and an explicit `Max-Age`. `Secure` is derived from the environment,
  never from its own env var that someone can set wrong.
- Logout revokes the refresh token in Redis and denylists the access token until its `exp`.
  A password change or reset revokes every session for that user.

## 5. Credentials, tokens and secrets

- Passwords: bcrypt at the configured cost, never a hand-rolled hash, never a second salt column.
- Compare a submitted password against a dummy hash when the user does not exist, so timing does not
  disclose account existence.
- Verification/reset/session tokens: ≥256 bits from `crypto/rand`, stored **hashed** (SHA-256 is
  sufficient for a high-entropy random token), compared with `subtle.ConstantTimeCompare`, single-use,
  with an explicit expiry.
- A raw token leaves the process only in the `notification.email_requested` event payload. It is never
  written to an audit event, never logged, never returned in an API response.
- Secrets in responses: never return `password_hash`, `jwt_secret`, internal ids of other tenants, or
  the existence of another tenant's data.

## 6. Before you…

- **log something** — ask whether every field would be safe in a shipped log archive.
- **add a config value** — write its validation and decide its production behaviour.
- **accept input** — set the max length, the allowed type, and the rejection code.
- **authorize** — check the privilege server-side, scope the query to the tenant, log the denial.
