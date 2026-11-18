# Ryugaware Backend — Project State

> **Source of truth.** Read this instead of re-reading the codebase.
> Maintained per Rule 0 in [`AGENTS.md`](./AGENTS.md): update it in the same turn as any change.
>
> Last updated: 2026-11-17 · Go 1.27.4 · module `github.com/ryuga/ryugaware/backend`

---

## Status

| Stage | Area | State |
|---|---|---|
| 1 | Module init + directory skeleton | ✅ done |
| 2 | `internal/config` — typed config, validation | ✅ done |
| 3 | `internal/platform/logger` — slog | ✅ done |
| 4 | `internal/shared/apperrors`, `internal/shared/response` | ✅ done |
| 5 | `internal/platform/database` + migrations | ✅ done (auth schema only) |
| 6 | `internal/platform/redis` | ✅ done (client + key builder) |
| 7 | `internal/platform/storage` (S3/MinIO) | ⬜ not started |
| 8 | `internal/platform/email` (SMTP/Mailpit) | ✅ done (stdlib SMTP, none/STARTTLS/TLS) |
| 9 | `internal/platform/messaging` (Redis Streams) | ✅ publisher, outbox relay, consumer groups, pending recovery, DLQ |
| 10 | `internal/bootstrap` + `cmd/api` lifecycle | ✅ done (wiring, health, graceful shutdown) |
| 11 | `auth` module | ✅ done (12 endpoints, 40 unit tests, smoke-tested end to end) |
| 12 | `admin` module | ⬜ not started |
| 13 | `audit` module + consumer | ⬜ not started |
| 14 | `notification` module + e-mail worker | ✅ worker delivers mail; **no admin endpoints** |
| 15 | `internal/shared/middleware` + route registration | ✅ done |
| 16 | Unit + integration tests | 🟨 52 unit tests (40 auth, 7 notification, 5 response); **no automated integration tests** |
| 17 | Dockerfile + compose | 🟨 `compose.yaml` (postgres, redis, minio, mailpit) + `.env.example`; **no app Dockerfile** |
| 18 | GitHub Actions CI/CD, Makefile, README | ⬜ not started |

Build health: `go build ./... && go vet ./... && gofmt -l .` — clean.

---

## Architecture (target)

Single deployable modular monolith. Business modules own their tables and expose
narrow service interfaces; everything asynchronous goes over Redis Streams.

```
cmd/api        → bootstrap.New(cfg) → App.Run(ctx)
cmd/migrate    → golang-migrate over embedded migrations/ (runs independently of the API)

internal/
  config/      typed config, loaded + validated once at startup
  platform/    infrastructure adapters (no business logic)
    logger/ database/ redis/ storage/ messaging/ email/
  shared/      apperrors/ response/ middleware/ validate/
  modules/     auth/ admin/ audit/ notification/
                 handler/ service/ repository/ model/ dto/ routes.go
  bootstrap/   composition root: app.go, infrastructure.go, modules.go
```

### Cross-module edges (no package cycles)

| Consumer | Interface (defined in consumer) | Implemented by |
|---|---|---|
| `admin/service` | `UserDirectory` — list/get/activate/deactivate users | `auth/service` |
| `shared/middleware` | `RoleResolver` — roles for a user id | `admin/service` (Redis-cached) |
| `shared/middleware` | `SessionChecker` — is session revoked | `auth/service` (Redis denylist) |

`auth` does **not** import `admin`. Roles are resolved per-request by middleware,
not embedded in the JWT, so a role change takes effect immediately and a stale
token cannot carry stale privileges.

---

## Package map

| Package | Purpose | State |
|---|---|---|
| `internal/config` | `Config` tree (App/HTTP/Postgres/Redis/Storage/SMTP/Log/Auth/Messaging), `Load()`, `Validate()` | ✅ |
| `internal/config` (`loader.go`) | env readers that accumulate all parse errors; production safety rules | ✅ |
| `internal/platform/logger` | `New()` slog JSON/text, context carry, secret redaction | ✅ |
| `internal/shared/apperrors` | `*Error` with `Code`, client-safe `Message`, wrapped cause, `Status()`, `Title()` | ✅ |
| `internal/shared/response` | `{data,meta}` success envelope, RFC 9457 `Problem` errors, `OK/Created/List/Error`, `CursorMeta` + `PageMeta`; `response_test.go` covers the error contract | ✅ |
| `internal/platform/database` | GORM pool (`New`/`Ping`/`Close`), slog GORM logger, driver error classification | ✅ |
| `internal/platform/redis` | go-redis client (`New`/`Ping`/`Close`/`Raw`), every key name in `keys.go`, `Script`, `TTLFloor` | ✅ |
| `internal/platform/messaging` | `Publisher` (XADD envelope), `Relay` (outbox → stream, `SKIP LOCKED`, backoff), `Consumer` (group, ack-after-success, `XPENDING`/`XCLAIM` recovery, DLQ) | ✅ |
| `internal/platform/email` | stdlib SMTP sender: `none`/`starttls`/`tls`, auth, timeouts, base64 HTML body, Message-ID | ✅ |
| `internal/modules/notification/{model,repository,service}` | `email_templates` lookup (tenant row overrides platform), `{{placeholder}}` renderer with HTML escaping, delivery recording, stream handler | ✅ |
| `internal/shared/middleware` | `RequestID`, `RequestLogger`, `Recovery`, `SecurityHeaders`, `CORS`, `BodyLimit`, `Timeout`, `Authenticate`, `RequirePrivilege`, `Identity` | ✅ |
| `internal/shared/binding` | `JSON`/`Query` binding with 413/400/422 classification and field errors | ✅ |
| `internal/modules/auth` | `routes.go` + `Authenticator` adapter for middleware | ✅ |
| `internal/modules/auth/model` | `Tenant`, `User`, `Role`, `License`, `OutboxEvent`, seeded ids | ✅ |
| `internal/modules/auth/dto` | request/response structs (camelCase JSON) | ✅ |
| `internal/modules/auth/repository` | all auth SQL, opaque `Tx` handle, `InTransaction`, duplicate-constraint helper | ✅ |
| `internal/modules/auth/store` | Redis OTP / proof / session / reset / rate-limit, four Lua scripts | ✅ |
| `internal/modules/auth/service` | verification, registration, sessions, passwords, JWT, bcrypt+pepper, platform-admin bootstrap | ✅ |
| `internal/modules/auth/handler` | 12 handlers, cookie handling | ✅ |
| `internal/bootstrap` | router + middleware stack, module wiring, health, relay, graceful shutdown | ✅ |
| `cmd/api` | config → logger → bootstrap → signal-driven shutdown | ✅ |
| `cmd/migrate` | `up`/`down`/`drop`/`goto`/`force`/`version` over the embedded SQL, waits for Postgres | ✅ |
| `compose.yaml` + `.env.example` | Local dependencies (Postgres 17, Redis 7, MinIO, Mailpit) and every environment variable with a working local value | ✅ |
| `migrations` | `embed.FS` of the versioned SQL read by `cmd/migrate` | ✅ |

`storage`, `email`, the stream consumers and the `admin`/`audit`/`notification` modules are still
planned, not written.

---

## Agent rules and skills

Path-scoped rules in `.claude/rules/` (repo root, outside `backend/`). They are loaded when a matching
file is touched, so they bind every future change without being pasted into `AGENTS.md`. `AGENTS.md`
keeps Rule 0 and the short architecture summary; the rule files carry the enforceable detail.

| File | Scope (`paths`) | Enforces |
|---|---|---|
| `backend-architecture.md` | `backend/**/*.go` | layer contract, composition root + middleware order, module-owned config structs, `%w`/`errors.Is` discipline, context propagation, cross-module contracts |
| `backend-multitenancy.md` | `backend/internal/**/*.go`, `backend/migrations/*.sql`, `backend/tests/**/*.go` | tenant identity only from the verified session, `(ctx, tenantID, …)` repository signatures, composite constraints/indexes, 404-vs-403, Redis key namespaces, required cross-tenant tests |
| `backend-api.md` | `handler/`, `dto/`, `routes.go`, `shared/response`, `shared/middleware` | route/status conventions, RFC 9457 problem documents, DTO + mass-assignment rules, `ShouldBind*`, cursor pagination, `Idempotency-Key` |
| `backend-persistence.md` | `repository/`, `model/`, `platform/database`, `migrations/*.sql` | `WithContext`, driver-error classification via `database.Is*`, dynamic-identifier allowlists, transaction rules, migration and index policy |
| `backend-security.md` | `backend/**/*.go` | `slog.LogValuer` allow-lists and PII rules, fail-fast secret validation, body limits and timeouts, JWT/cookie/session rules, token hashing |
| `ask-before-assuming.md` | **no `paths`** — every session | ask before settling naming, contracts, schema shape, security trade-offs or scope; batch the questions with costed options; log the assumption when nobody can answer |
| `backend-testing.md` | `backend/**/*_test.go`, `backend/tests/**/*.go` | stdlib-only tests, unit vs `integration` tag, the required cross-tenant / IDOR / redaction / cancellation / idempotency cases |
| `backend-quality.md` | `backend/**/*.go` | anti-bloat ("justify every line", no generic repos, no speculative code), **no comments at all in Go code**, SOLID as applied here (1–3-method consumer interfaces), flat control flow, pre-allocation and `strings.Builder`, per-call deadlines, graceful shutdown |
| `backend-messaging.md` | `platform/messaging`, `modules/notification`, `modules/audit`, `modules/**/service`, `migrations/*.sql` | transactional outbox inside the state transaction, relay with `SKIP LOCKED`, consumer groups, `XACK` only after success, bounded retries, DLQ for poison pills, idempotency on `event_id` |

Skills in `.claude/skills/` (procedures, not constraints): `backend-endpoint` (add or change a route
end to end), `backend-migration` (write and verify a schema migration, including the throwaway-Postgres
recipe), `backend-module` (scaffold and wire a new module).

The rules are standards, not a claim about the code. The one part now implemented is the API error
contract: `internal/shared/response` emits RFC 9457 problem documents and carries tests for it.
Everything else the rules describe (tenant-scoped repositories, Redis key namespaces, the outbox and
its relay, idempotency, middleware, graceful shutdown) is still unwritten — see **Known gaps**.

---

## Error codes (API contract)

`validation_failed` (422) · `bad_request` (400) · `unauthorized` (401) · `forbidden` (403) ·
`not_found` (404) · `conflict` (409) · `payload_too_large` (413) · `rate_limited` (429) ·
`internal_error` (500) · `service_unavailable` (503)

Response shapes:
- success — `{"data": ..., "meta": {...}?}`, `meta` is `CursorMeta` (`next_cursor`, `has_more`,
  `page_size`) or, for documented exceptions, `PageMeta` (`page`, `page_size`, `total_items`,
  `total_pages`)
- failure — an **RFC 9457 problem document**, `Content-Type: application/problem+json; charset=utf-8`:
  `type` (`/problems/<code>`), `title`, `status`, `detail`, `instance`, plus the documented extension
  members `code`, `errors` (`[{field, pointer, detail}]`) and `request_id`. Clients switch on `code`,
  never on `detail`.

---

## HTTP surface

Live. Health is unversioned; everything else is under `/api/v1`. Request and response bodies are
**camelCase**; errors are RFC 9457 problem documents.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/healthz` | public | liveness |
| GET | `/readyz` | public | Postgres + Redis probe, 503 when either is down |
| POST | `/api/v1/auth/email-verification/otp` | public | send a 6-digit OTP to an unregistered e-mail |
| POST | `/api/v1/auth/email-verification/verify` | public | check the OTP, return the registration proof |
| POST | `/api/v1/auth/email-verification/resend` | public | re-send, honouring the cooldown |
| POST | `/api/v1/auth/register` | registration proof | create tenant + admin user + licence |
| POST | `/api/v1/auth/sessions` | public | login, sets both cookies |
| POST | `/api/v1/auth/tokens/refresh` | refresh cookie | rotate the session |
| GET | `/api/v1/auth/me` | optional | `{authenticated, user}` — 200 either way |
| DELETE | `/api/v1/auth/sessions/current` | optional | logout, idempotent |
| POST | `/api/v1/auth/password/forgot` | public | queue a reset e-mail, always `{sent:true}` |
| GET | `/api/v1/auth/password/reset/validate?token=` | public | `{valid}` without consuming the token |
| POST | `/api/v1/auth/password/reset` | reset token | set a new password, revoke every session |
| POST | `/api/v1/auth/password/change` | session | change password, revoke every session |

Planned, not implemented: `/admin/*` (users, roles), `/admin/audit-events`, `/admin/notifications`.

Registration flow: **e-mail is verified before any row exists.** OTP (5 min, 3 attempts, 30-minute
lockout) → registration proof (random token, hash in Redis, 3 min) → `/auth/register` consumes the
proof atomically, then writes tenant + user + licence + outbox event in one transaction.

---

## Data model

All PKs are `UUID DEFAULT gen_random_uuid()`; all timestamps are `TIMESTAMPTZ`, set by the application.

| Table | Owner | Key columns | Notes |
|---|---|---|---|
| `tenants` | auth | `name` CITEXT (≤80, **UNIQUE**, case-insensitive), `password_pepper`, `jwt_secret`, `is_active`, `is_platform` | The organization. `password_pepper` is per tenant and feeds the login hash; `jwt_secret` signs that tenant's dashboard access tokens through a derived key, and will sign its storefront tokens through a different one. One seeded platform tenant (`…0001`, `is_platform`), enforced by a partial unique index |
| `licenses` | admin | `tenant_id` (**UNIQUE**), `plan`, `max_websites`, `storage_limit_bytes`, `starts_at`, `expires_at` | One per tenant; defaults are the free plan (1 website, 10 GiB, +1 year) |
| `roles` | admin | `tenant_id` (**nullable**), `name`, `type` | `tenant_id IS NULL` = global system role. Three are seeded: `super_admin`, `admin`, `member` (fixed ids `…000a/b/c`). Tenant rows may only be `custom`. Partial unique indexes on global name and global type |
| `privileges` | admin | `name` (`resource.action`, unique), `type` | Fixed catalog, 22 rows |
| `role_privileges` | admin | PK `(role_id, privilege_id)` | Seeded: super_admin and admin get all 22, member gets the 11 `*.read` |
| `platform_users` | auth | `tenant_id`, `role_id`, `role_tenant_id` (**nullable**), `full_name`, `email` CITEXT UNIQUE, `password_hash`, `password_changed_at`, `last_login_at`, `is_active` | **No `email_verified_at`** — verification happens before the row exists. `role_tenant_id` is NULL for a global role and equals `tenant_id` for a custom one, enforced by a CHECK plus the composite FK `(role_id, role_tenant_id) → roles (id, tenant_id)` |
| `email_templates` | notification | `tenant_id` (**nullable**), `name`, `subject`, `body`, `variables` JSONB | `tenant_id IS NULL` = platform default |
| `email_deliveries` | notification | `event_id` PK, `tenant_id`, `template`, `to_address`, `status`, `attempts`, `error`, `sent_at` | Idempotency for the worker: a redelivered event whose row is `SENT` is skipped. A `FAILED` row keeps the reason for support |
| `outbox_events` | platform/messaging | `event_id` PK, `event_type`, `aggregate_id`, `tenant_id`, `payload`, `metadata`, `status`, `attempts`, `available_at`, `published_at` | Written inside the business transaction, drained by the relay. Partial index on `(available_at, created_at) WHERE status = 'PENDING'` |

Deleting a `tenants` row removes the whole tenant by cascade, licence included.

**Sessions are not in Postgres.** Refresh tokens, OTPs, registration proofs and reset tokens live only
in Redis, all hashed — see the Redis key list below.

| Redis key | Holds | TTL |
|---|---|---|
| `…:email-verification:otp:{email}` | OTP **hash** (HMAC) + attempt counter | `AUTH_OTP_TTL` (5 min) |
| `…:email-verification:cooldown:{email}` | resend throttle | `AUTH_OTP_RESEND_COOLDOWN` (1 min) |
| `…:email-verification:blacklist:{email}` | lockout after 3 wrong codes | `AUTH_OTP_BLACKLIST_TTL` (30 min) |
| `…:email-verification:verified:{email}` | registration proof **hash** | `AUTH_REGISTRATION_PROOF_TTL` (3 min) |
| `…:auth:refresh:{session_id}` | refresh **hash**, user id, tenant id | `AUTH_REFRESH_TOKEN_TTL` |
| `…:auth:sessions:{user_id}` | ZSET of that user's session ids | refresh TTL |
| `…:auth:access:blacklist:{jti}` | revoked access token | remaining token life |
| `…:auth:password-reset:{token_hash}` | user id + tenant id | `AUTH_PASSWORD_RESET_TTL` |
| `…:t:{tenant_id}:signing-key` | that tenant's **derived** dashboard key (hex), or `-` for "no such tenant" | `AUTH_TENANT_KEY_CACHE_TTL` (a tenth of it for a miss) |
| `…:auth:ratelimit:{scope}:{ip\|email}` | attempt counter | `AUTH_LOGIN_RATE_WINDOW` |

Four Lua scripts keep the multi-step operations atomic: OTP verify (compare → delete → write proof, or
increment attempts → blacklist), proof consume (compare → delete), refresh rotate (compare → replace,
or detect reuse), reset consume (read → delete).

Planned, not created: `audit_events`, `email_deliveries`.

**No performance indexes beyond the outbox one.** Every other index backs a PK or a uniqueness
constraint, so FK columns remain unindexed.

---

## Migrations

`migrations/` holds versioned `NNNNNN_name.{up,down}.sql`, embedded via
`migrations/embed.go` into `cmd/migrate`. **`AutoMigrate` is never used.**

| Version | File | Creates |
|---|---|---|
| 2 | `notification_delivery` | `email_deliveries`; rewrites the platform `password_reset` template from an OTP code to a `{{reset_url}}` button |
| 1 | `init` | `citext`, `pgcrypto`; `tenants`, `licenses`, `roles`, `privileges`, `role_privileges`, `platform_users`, `outbox_events`, `email_templates`; seeds: the platform tenant, the 3 global roles, their privilege mappings, the 22-row privilege catalog and the 5 platform default templates |

**There is exactly one migration.** The five original files were merged into
`000001_init.{up,down}.sql` by owner request, so the whole schema is created and
dropped as one unit. Later schema changes get their own numbered pair; this file
is not edited again once it has been applied anywhere real.

The SQL carries no comments, by request.

Verified against Postgres 17 after the auth changes: `up` → `down` → `up` leaves no stray tables,
indexes or extensions; the platform tenant, 3 global roles and their 22/22/11 privilege rows seed;
a global role can be assigned to any tenant's user; assigning **another tenant's custom role** is
rejected by `platform_users_role_same_tenant_fkey`; a duplicate organization name is rejected by
`tenants_name_key`; licence defaults still read back as 1 website / 10 GB / 365 days.

---

## Event catalog

Transport: **transactional outbox → relay → Redis Streams**, stream `ryugaware:events:v1`,
DLQ `…:v1:dlq`. Envelope: `event_id`, `event_type`, `event_version`, `source`, `occurred_at`,
`payload`, `metadata`.

| Event | Producer | Path | Consumers |
|---|---|---|---|
| `auth.user_registered` | auth | outbox (in the registration transaction) | audit *(not written)* |
| `notification.email_sent` / `_failed` | — | recorded in `email_deliveries` instead of re-published | — |
| `auth.password_changed` | auth | outbox (reset and change) | audit *(not written)* |
| `auth.user_logged_in` / `auth.user_login_failed` | auth | direct publish | audit *(not written)* |
| `auth.user_logged_out` | auth | direct publish | audit *(not written)* |
| `auth.password_reset_requested` | auth | direct publish | audit *(not written)* |
| `notification.email_requested` | auth | direct publish (OTP, reset); outbox (welcome, password changed) | **notification worker — live** |
| `admin.*`, `notification.email_sent/_failed`, `audit.event_created` | — | — | planned |

Events that belong to a database write go through `outbox_events` so the row and the event commit
together. Events with no row to tie to (OTP e-mail, login outcomes) are published straight to the
stream; a failed OTP publish fails the request with 503 rather than claiming the mail was sent.

`notification-worker` is the only consumer group. It reads `notification.email_requested`, renders the
template, sends through SMTP, writes an `email_deliveries` row and acks only then. Failures stay
pending, are reclaimed after `EVENTS_CLAIM_MIN_IDLE`, and go to the DLQ past `EVENTS_MAX_RETRIES`.
Auth's own facts (`auth.user_registered`, `auth.password_changed`, login events) are published but
**nothing consumes them** until the audit module exists.

---

## Environment variables

Defined in `internal/config`. Groups and defaults:

| Prefix | Keys |
|---|---|
| `APP_` | `NAME`, `ENV`, `VERSION`, `SHUTDOWN_TIMEOUT`, `PUBLIC_BASE_URL` |
| `HTTP_` | `HOST`, `PORT`, `READ_TIMEOUT`, `READ_HEADER_TIMEOUT`, `WRITE_TIMEOUT`, `IDLE_TIMEOUT`, `MAX_HEADER_BYTES`, `TRUSTED_PROXIES`, `BODY_LIMIT_BYTES` |
| `CORS_` | `ALLOWED_ORIGINS`, `ALLOWED_METHODS`, `ALLOWED_HEADERS`, `EXPOSED_HEADERS`, `ALLOW_CREDENTIALS`, `MAX_AGE` |
| `POSTGRES_` | `HOST`, `PORT`, `USER`, `PASSWORD`, `DB`, `SSLMODE`, `MAX_OPEN_CONNS`, `MAX_IDLE_CONNS`, `CONN_MAX_LIFETIME`, `CONN_MAX_IDLE_TIME`, `SLOW_QUERY_THRESHOLD`, `STATEMENT_TIMEOUT` |
| `REDIS_` | `ADDR`, `PASSWORD`, `DB`, `POOL_SIZE`, `MIN_IDLE_CONNS`, `DIAL_TIMEOUT`, `READ_TIMEOUT`, `WRITE_TIMEOUT`, `KEY_PREFIX` |
| `STORAGE_` | `PROVIDER` (s3\|minio), `REGION`, `BUCKET`, `ENDPOINT`, `PUBLIC_ENDPOINT`, `ACCESS_KEY`, `SECRET_KEY`, `USE_PATH_STYLE`, `PRESIGN_EXPIRY`, `MAX_UPLOAD_BYTES`, `ALLOWED_MIME` |
| `SMTP_` | `HOST`, `PORT`, `USERNAME`, `PASSWORD`, `FROM_ADDRESS`, `FROM_NAME`, `TLS_MODE` (none\|starttls\|tls), `INSECURE_SKIP_VERIFY`, `TIMEOUT` |
| `LOG_` | `LEVEL`, `FORMAT`, `ADD_SOURCE` |
| `AUTH_` | `TOKEN_HMAC_SECRET`, `JWT_ISSUER`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `BCRYPT_COST`, `EMAIL_VERIFICATION_TTL`, `PASSWORD_RESET_TTL`, `MAX_ACTIVE_SESSIONS`, `LOGIN_RATE_LIMIT`, `LOGIN_RATE_WINDOW`, `ROLES_CACHE_TTL`, `TENANT_KEY_CACHE_TTL`, `OTP_TTL`, `OTP_MAX_ATTEMPTS`, `OTP_RESEND_COOLDOWN`, `OTP_BLACKLIST_TTL`, `REGISTRATION_PROOF_TTL`, `COOKIE_DOMAIN`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME` |
| `EVENTS_` | `STREAM`, `DLQ_STREAM`, `STREAM_MAXLEN`, `LIVE_CHANNEL`, `BATCH_SIZE`, `BLOCK_TIMEOUT`, `MAX_RETRIES`, `CLAIM_MIN_IDLE`, `CLAIM_INTERVAL`, `HANDLER_TIMEOUT`, `WORKERS_ENABLED` |
| misc | `ENV_FILE` (overrides which dotenv file is read) |

Required with no safe default: `AUTH_TOKEN_HMAC_SECRET` (renamed from `AUTH_JWT_SECRET`, Decision 49).
It signs nothing: it is the service-wide HMAC key for hashing OTPs, registration proofs, refresh
tokens and reset tokens — all of which exist before, or independently of, any tenant. Access tokens
are signed with the tenant's own `jwt_secret`. Production additionally rejects
a short JWT secret, `POSTGRES_SSLMODE=disable`, empty DB password, plaintext SMTP,
`STORAGE_PROVIDER != s3`, non-JSON logs, and `CORS *` + credentials. `Validate()` also enforces
positive OTP/proof TTLs, `OTP_MAX_ATTEMPTS >= 1`, and a password whenever
`AUTH_BOOTSTRAP_ADMIN_EMAIL` is set. The OTP/token HMAC key is derived from `AUTH_JWT_SECRET`
(domain-separated), so there is no extra secret to manage.

---

## Dependencies

| Module | Version | Used for |
|---|---|---|
| `github.com/gin-gonic/gin` | v1.12.0 | HTTP router |
| `gorm.io/gorm` + `gorm.io/driver/postgres` | v1.31.2 / v1.6.3 | ORM |
| `github.com/redis/go-redis/v9` | v9.23.0 | cache + streams |
| `github.com/golang-migrate/migrate/v4` | v4.20.1 | versioned migrations |
| `github.com/jackc/pgx/v5` | v5.10.0 | `database/sql` driver for `cmd/migrate`; GORM's Postgres driver uses it too |
| `github.com/golang-jwt/jwt/v5` | v5.3.1 | access tokens |
| `github.com/google/uuid` | v1.6.0 | ids |
| `github.com/joho/godotenv` | v1.5.1 | `.env` for local dev |
| `golang.org/x/crypto` | v0.59.0 | bcrypt |

The AWS SDK is **not** a dependency yet; it arrives with `internal/platform/storage`.

Tests use the standard library only — no testify.

---

## Wiring graph

`internal/bootstrap` is the only place constructors are called. Live order:

```
config.Load → logger.New → database.New → redis.New → messaging.NewPublisher → messaging.NewRelay
  → auth repository.New(db) → auth store.New(redis, ttls) → auth service.New(repo, store, publisher, policy)
  → auth handler.New(service, cookie config) → auth.RegisterRoutes(/api/v1, handler, authenticator)
  → health routes → EnsurePlatformAdmin (when AUTH_BOOTSTRAP_ADMIN_EMAIL is set)
  → http.Server → relay goroutine → signal-driven graceful shutdown
```

Middleware order on every request: `RequestID → RequestLogger → Recovery → SecurityHeaders → CORS →
BodyLimit → Timeout`, then per-route `Authenticate` (required or optional) and `RequirePrivilege`.

`bootstrap.eventPublisher` adapts `auth/service.Event` onto `messaging.Envelope`, so the auth module
never imports the messaging package and the platform never imports a module.

---

## Known gaps

- **No `audit-worker`.** Auth's facts (`auth.user_registered`, `auth.password_changed`,
  `auth.user_logged_in` / `_login_failed`, `auth.user_logged_out`) are published to the stream and
  nothing reads them; there is no `audit_events` table. The stream grows until `EVENTS_STREAM_MAXLEN`
  trims it.
- **The notification module has no HTTP surface**: templates can only be changed in the database, and
  `/admin/notifications` is unimplemented. There is also no retry/inspection tooling for the DLQ.
- **The OTP mail is published directly, not through the outbox**, because no database row accompanies
  it. If Redis accepts the publish and the worker then fails permanently, the user sees "sent" and
  never receives a code; the `email_deliveries` row records the failure for support.
- `admin`, `audit` and `notification` modules are unwritten, so `/admin/*` returns 404.
- `internal/platform/storage` (S3/MinIO) is unwritten; the AWS SDK is not in `go.mod`.
- **No automated integration tests.** The 52 unit tests use fakes; the end-to-end run described in
  the Build log was done by hand and is not repeatable in CI. Cross-tenant tests required by
  `.claude/rules/backend-multitenancy.md` §6 do not exist — there is only one tenant-owned table so
  far, but the pattern must be in place before `admin` lands.
- **The frontend now speaks this API.** `frontend/src/features/auth` and `lib/api/baseApi.ts` were
  rewritten for it: the real paths, camelCase bodies, RFC 9457 parsing into the flat
  `{code, message, fieldErrors}` the forms already read, OTP-first registration, and a silent
  refresh-and-retry on 401. What is left is pointing it at the backend —
  `NEXT_PUBLIC_USE_DUMMY_API=false` and `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1` in the
  frontend environment — the default is now the backend itself
  (`http://localhost:8080/api/v1`). **The dummy API layer has been deleted** (owner's call): its
  `lib/api/dummy/` runtime, all 14 `features/*/dummy.ts` route files, the `public/data/*.json`
  fixtures and the demo-data switcher are gone, so every dashboard page now depends on a backend
  module that does not exist yet and will show its error state until `admin`, `audit` and
  `notification` are built.
- **A tenant's signing key is cached for `AUTH_TENANT_KEY_CACHE_TTL` (5 min).** Deactivating a tenant
  therefore stops its *existing* access tokens up to five minutes later, because the key lookup is what
  is cached. Logout, password changes and user deactivation are unaffected — they are checked per
  request. `store.InvalidateTenantSigningKey` exists for the rotation endpoint that does not exist yet;
  until it does, a tenant's `jwt_secret` cannot be rotated through the API.
- **`tenants.password_pepper` is stored in plaintext** next to the hashes it protects, which blunts
  its purpose if the database alone leaks. Encrypting it under a master key held outside Postgres (KMS
  or a sealed secret) is the documented next step; the hashing scheme itself does not change.
- `AUTH_EMAIL_VERIFICATION_TTL` and `AUTH_ROLES_CACHE_TTL` are loaded and validated but **unused**:
  OTP lifetime is `AUTH_OTP_TTL`, and privileges are read per request rather than cached.
- Registration itself has no rate limit; abuse is bounded only by the OTP cooldown and blacklist
  upstream of it. `RequirePrivilege` exists but no route uses it yet.
- `EnforceSessionLimit` reads then trims in two steps, so two simultaneous logins can briefly exceed
  `AUTH_MAX_ACTIVE_SESSIONS`.
- Row-Level Security and `Idempotency-Key` remain unimplemented standards.
- `cmd/migrate drop` succeeds but exits 1 (reads the version after dropping `schema_migrations`).
- `.env.example`, `Makefile`, `Dockerfile`, `compose.yaml`, CI workflows and README: not written.

---

## Decision log

*Append-only. Newest last.*

1. **2026-11-13 — Go 1.27.4 pinned in `go.mod`.** Host toolchain is 1.22.2;
   `GOTOOLCHAIN=auto` downloads 1.27.4 transparently. CI pins the same version.
2. **2026-11-13 — Config loader is hand-written, not `envconfig`/`viper`.**
   ~200 lines of explicit readers, no struct-tag reflection, and it accumulates
   *all* parse errors so a bad deployment reports every problem on first boot.
   Only `godotenv` is pulled in, for local `.env` support.
3. **2026-11-13 — `godotenv.Load` (not `Overload`).** Real environment variables
   must win over `.env`, so the same image behaves correctly in compose and in prod.
4. **2026-11-13 — Errors carry a client-safe `Message` plus a private cause.**
   Handlers cannot accidentally leak internals: `response.Error` serialises only
   `Message`/`Code`/`Details` and logs the cause for 5xx.
5. **2026-11-13 — Secret redaction in the slog handler.** A `ReplaceAttr` hook
   blanks known-sensitive keys. It is a safety net, not a licence to log secrets.
6. **2026-11-13 — Roles resolved per-request, not stamped into the JWT.**
   Avoids an `auth → admin` package cycle *and* stale-privilege tokens; cost is
   one Redis lookup per authenticated request, cached for `AUTH_ROLES_CACHE_TTL`.
7. **2026-11-13 — This file + `AGENTS.md` Rule 0 adopted** so sessions resume from
   a written state instead of re-reading the tree.
8. **2026-11-17 — UUID primary keys, not `INT GENERATED ALWAYS AS IDENTITY`.**
   The reference schema this was modelled on uses identity ints. Rejected: the
   frontend types every id as `string`, and sequential ids in a multi-tenant SaaS
   leak customer counts and are enumerable in URLs. Cost is 16 bytes per key and
   non-sequential index inserts, which is acceptable at this scale.
9. **2026-11-17 — One role per user (`users.role_id`), not a `user_roles` join.**
   Supersedes the earlier plan. The frontend models `role` as a single
   `owner|admin|member` value, so a many-to-many table would have been an
   unused generalisation. Fine-grained access lives in `role_privileges` instead.
10. **2026-11-17 — Roles are per-tenant, privileges are global.** Privilege
    names are checked by the code, so they must be identical for every tenant and
    are seeded by migration. Role *names* are tenant-visible labels, so tenants
    own them and can later add `custom` roles.
11. **2026-11-17 — Cross-tenant role assignment is blocked by a composite FK**
    `users (role_id, tenant_id) → roles (id, tenant_id)`, not by an
    application check. A plain `REFERENCES roles(id)` would let one bug assign
    another tenant's role — a privilege escalation nothing in the code would catch.
12. **2026-11-17 — That FK is `ON DELETE NO ACTION`, not `RESTRICT`.** Both refuse
    to delete a role that still has users. `RESTRICT` is checked the instant the
    role row is deleted, so deleting a tenant — which cascades into roles
    *and* users in one statement — would succeed or fail depending on cascade
    trigger order. `NO ACTION` defers the check to end of statement.
13. **2026-11-17 — No `password_salt` column.** The reference has one; bcrypt
    embeds its salt in the hash, so a second column would be dead weight and an
    invitation to hand-roll hashing later. `VARCHAR(255)` leaves room for argon2id.
14. **2026-11-17 — `email_verified_at TIMESTAMPTZ` instead of a boolean.** One
    column cannot disagree with itself the way a `bool` + `verified_at` pair can.
15. **2026-11-17 — `tenants.name` is not unique.** The reference makes the
    tenant name unique. Rejected: two unrelated customers may legitimately share a
    company name, and the frontend's register flow only reports a conflict on
    e-mail. E-mail is the identity; the tenant name is a label.
16. **2026-11-17 — Refresh tokens are stored hashed, in Postgres.** *(Superseded
    by 18 — they live in Redis instead, and the table was removed.)* Without the
    table, logout cannot be enforced, the sessions list has nothing to read, and a
    stolen token stays valid until expiry. Plain SHA-256 is sufficient (the token
    is 256 bits of CSPRNG output, so there is nothing for a slow KDF to protect).
17. **2026-11-17 — `email_templates.tenant_id` is nullable: NULL = platform
    default.** The reference scopes every template to a tenant, which has no
    answer for "which template does a brand-new tenant get?". Two partial unique
    indexes are required because `NULL ≠ NULL` in a plain unique index.
18. **2026-11-17 — Refresh tokens live in Redis only; no `refresh_tokens` table.**
    Owner's call. Sessions are short-lived, high-churn rows whose main operations
    are "is this token live?" and "drop it" — a Redis key with a TTL does both
    without a cleanup job, and expiry is handled by Redis rather than by a sweep.
    The cost is recorded under **Known gaps**: sessions do not survive a Redis
    flush, and nothing about a sign-in is durably recorded outside the event
    stream. `AUTH_MAX_ACTIVE_SESSIONS` must be enforced with a per-user Redis
    sorted set rather than a `COUNT(*)`.
19. **2026-11-17 — `users` renamed to `platform_users`.** Owner's call, and it
    leaves the unqualified name free: "user" in this product also means a
    storefront shopper, who is a different entity on a different table. The
    `users.read` / `users.manage` privilege names were left alone — they name the
    team-management feature, not the table.
20. **2026-11-17 — Migrations renumbered after the `refresh_tokens` removal**
    (`email_templates` 6 → 5). Safe only because nothing has been applied outside
    a throwaway container. Once this is deployed anywhere, versions are frozen.
21. **2026-11-17 — No comments in the migration SQL, and no performance indexes.**
    Owner's call: indexes are added deliberately, in their own migration, when a
    real query needs one, rather than guessed at table-creation time. Unique and
    primary-key indexes stay, because those enforce correctness rather than
    speed — dropping them would change what the database accepts, not how fast
    it answers. Rationale that used to live in SQL comments is recorded here.

22. **2026-11-17 — `organizations` renamed to `tenants`, and every
    `organization_id` to `tenant_id`.** Owner's call. The word the rest of the
    document already used for the entity ("the tenant") is now the word in the
    schema, and it keeps "organization" free as a customer-facing label if the
    product ever needs one. Nothing in Go referenced the old name — the rename
    was migration-only. The `{{organization_name}}` variable in the welcome
    e-mail template was deliberately left alone: it is copy shown to a person,
    not a column.
23. **2026-11-17 — Entitlements live in a `licenses` table, one row per tenant,
    not in columns on `tenants`.** A licence changes on a different schedule than
    the tenant does (renewal, upgrade, expiry) and will want its own audit trail;
    keeping it separate also means a plan change touches no row that a login
    reads. `tenant_id` is `UNIQUE`, so this is one *current* licence per tenant,
    not a history — if renewals ever need to be kept, that becomes a separate
    `license_periods` table rather than a relaxed constraint here.
24. **2026-11-17 — Licence defaults live in the column defaults** (`'default'`,
    `1`, `10737418240`, `now() + INTERVAL '1 year'`), so the free plan is what
    you get from `INSERT INTO licenses (tenant_id) VALUES (…)` and the Go code
    does not have to carry the same three numbers. Storage is a `BIGINT` of
    **bytes** (10 GiB), not gigabytes, so quota arithmetic never needs a unit
    conversion. A plan catalog table was rejected as premature: there is one
    plan.
25. **2026-11-17 — The five migrations were merged into a single
    `000001_init` pair.** Owner's call. Safe only because nothing has been
    applied outside a throwaway container; the trade-off is that the schema can
    no longer be rolled back a table at a time — `down` drops everything.

26. **2026-11-17 — The error envelope stays `{"error":{code,message,details,request_id}}`;
    RFC 9457 `application/problem+json` is not adopted.** *(Superseded by 31 — the owner
    asked for RFC 9457 a second time; it is now implemented.)* Problem Details is the
    better-known contract and remains the documented migration target, but switching
    now would change `internal/shared/response` and the frontend's `baseApi` parser at
    once for no security gain, and the frontend is already written against a flat
    shape that is not problem+json either. Migration path, if taken: replace
    `ErrorBody` with `type`/`title`/`status`/`detail`/`instance` plus extension members
    for `code`, `errors` and `request_id`, set the content type, and change the
    frontend in the same commit. Mixed formats across endpoints are forbidden.
27. **2026-11-17 — Page-based pagination stays the default contract** *(Superseded by
    32 — cursor pagination is now the default, page numbers the exception.)*
    (`page`/`page_size`/`total_items`/`total_pages`, already in `response.Meta`), with
    cursor pagination as a per-endpoint exception for append-only or high-churn lists
    (audit events, deliveries). Reason: ~20 frontend list views are written against
    page numbers; two contracts are acceptable only where deep offsets would scan.
    Either way the order must be stable with a unique tie-breaker.
28. **2026-11-17 — Tenant isolation is enforced by explicit repository predicates,
    not by GORM scopes and not by Row-Level Security.** Every tenant-owned method takes
    `(ctx, tenantID, …)` and puts `tenant_id` in the SQL; a forgotten `.Scopes(...)` is
    silent, which disqualifies scopes as the boundary. RLS stays available as defense
    in depth later, and would require transaction-scoped `SET LOCAL` (a session `SET`
    leaks across pooled connections), `FORCE ROW LEVEL SECURITY` and a non-owner role.
    Out-of-scope resources answer `404`, not `403`, so ids cannot be enumerated.
29. **2026-11-17 — `Idempotency-Key` is scoped to side-effecting endpoints only, and is
    described as an IETF Internet-Draft, not an RFC** (draft-ietf-httpapi-idempotency-
    key-header). Key scope is `(tenant_id, user_id, endpoint, key)`, the record stores a
    body fingerprint, a mismatched replay is `422`, an in-flight duplicate is `409`, and
    the record commits in the same transaction as the effect.
30. **2026-11-17 — Engineering standards live in path-scoped `.claude/rules/` files,
    not in a growing `AGENTS.md`.** Rules load when a matching file is touched, which
    keeps per-task context small and lets handler, repository, migration and test rules
    differ. `AGENTS.md` keeps Rule 0 and the summary; duplication between the two is a
    bug, and the rule files are the detailed source.

31. **2026-11-17 — RFC 9457 adopted: errors are problem documents.** Reverses 26 on the
    owner's instruction, restated after the trade-off was put to them. `response.Error`
    now renders `response.Problem` as `application/problem+json; charset=utf-8` with
    `type` = `/problems/<code>` (a relative URI reference, so no hostname is baked into
    payloads), `title` from the new `apperrors.Error.Title()`, `detail` = the client-safe
    message, `instance` = the request path, and the documented extension members `code`,
    `errors` and `request_id`. Field errors follow RFC 9457's own example shape — an
    `errors` array of `{field, pointer, detail}` with an RFC 6901 JSON Pointer — rather
    than RFC 7807's `invalid-params`, since 9457 leaves the structure to the API and a
    pointer survives nested payloads. `code` stays the member clients switch on, because
    a relative `type` URI is a weak discriminator. Cost, recorded under **Known gaps**:
    the frontend's error parser must change before it leaves the dummy API.
32. **2026-11-17 — Cursor pagination is the default for collections.** Reverses 27 on the
    same instruction. `response.CursorMeta` (`next_cursor`, `has_more`, `page_size`) is
    what `response.List` carries; `PageMeta` survives for endpoints that genuinely need a
    total count, and using it requires a note in **HTTP surface** saying why. Cursors are
    opaque (base64url of the last sort key + `id` + a filter/order fingerprint), validated
    on arrival, and rejected with `bad_request` when they do not match the current query —
    never silently reset to page one. The shared codec lands in
    `internal/shared/pagination` with the first cursor endpoint; it was not written
    speculatively.

33. **2026-11-17 — `validation_failed` returns 422, not 400.** Owner's standard, and it
    matches RFC 9110: a body that cannot be parsed is a syntax problem (400, `bad_request`),
    while a well-formed body that breaks a field rule reached validation and is
    semantically unprocessable (422). The split is visible to clients only in `status`;
    they still switch on `code`. `apperrors.Status()` carries the mapping.
34. **2026-11-17 — Asynchronous side effects go through a transactional outbox.**
    Supersedes "publish after commit". A commit followed by a publish can lose the event,
    and a publish followed by a failed commit invents one; both are dual-write bugs that
    show up as a user with no welcome e-mail or an audit trail for something that never
    happened. The producer writes an `outbox_events` row in the same transaction; a relay
    claims `PENDING` rows with `FOR UPDATE SKIP LOCKED` and publishes them. The relay may
    publish twice after a crash, which is why consumers are idempotent on `event_id` —
    at-least-once, never at-most-once. Cost: one more table, one more background loop, and
    events are visible a tick late.
35. **2026-11-17 — New Go code carries no explanatory comments.** Owner's call, extending
    the no-comments convention already in force for the migration SQL (Decision 21).
    Rationale belongs in this Decision log, where it stays readable and versioned, instead
    of in prose above a function that drifts out of date. Exceptions: one-line doc comments
    on exported identifiers, `//nolint`/`//go:` directives, and `TODO(owner):` tied to a
    tracked gap. Existing files are not churned to strip their comments.

36. **2026-11-17 — E-mail is verified before anything is created, so `email_verified_at` is gone.**
    Owner's specification. A tenant, user and licence only exist once the address has proved itself,
    which removes the "unverified tenant" state the old column represented, removes the need to clean
    those rows up, and makes login one check shorter. The cost: the proof lives only in Redis, so a
    Redis flush between verification and registration forces the user to request a new code.
37. **2026-11-17 — OTP: six digits, Redis-only, hashed, three attempts, 30-minute lockout.** The code
    is `crypto/rand` over `[0,999999]` rendered with leading zeros, stored as an HMAC-SHA256 hash so a
    Redis dump does not hand out valid codes. The HMAC key is derived from `AUTH_JWT_SECRET`
    (`HMAC(secret, "ryugaware:token-hash:v1")`) rather than adding a second secret to manage — a
    domain-separated derivation, not a fallback. Attempts are counted inside the same Lua script that
    compares the hash, so a race cannot buy extra guesses.
38. **2026-11-17 — The registration proof is consumed *before* the transaction, not after it.** The
    owner's spec says both (S19 after commit, the concurrency note before). Before wins: consuming
    first makes two concurrent registrations with one proof impossible, and the failure mode — a
    database error after consumption forces a new OTP — is the cheaper one. Consume is a Lua
    compare-and-delete, so it is atomic.
39. **2026-11-17 — Password hashing is `bcrypt(base64(HMAC-SHA256(tenant_pepper, password)))`.**
    Bcrypt truncates at 72 bytes, so concatenating a pepper is unsafe; pre-hashing to a fixed 44-char
    digest removes the limit and keeps the pepper out of the bcrypt input length budget. The pepper is
    per tenant, generated at registration, which means a stolen hash cannot be attacked without also
    stealing that tenant's row. Its plaintext storage is recorded under **Known gaps**.
40. **2026-11-17 — Global roles plus a platform tenant, instead of per-tenant built-in roles.**
    Owner's call. `roles.tenant_id` is now nullable: NULL rows are the seeded `super_admin`, `admin`
    and `member`; tenants may still own `custom` roles. Registration assigns the existing global admin
    row rather than minting three roles per tenant. Cross-tenant assignment is still impossible at the
    database level through a mirror column: `platform_users.role_tenant_id` is NULL for a global role
    and must equal `tenant_id` otherwise (CHECK), with the composite FK `(role_id, role_tenant_id) →
    roles (id, tenant_id)` doing the rest. A seeded platform tenant (`…0001`, `is_platform`) owns
    staff accounts; `AUTH_BOOTSTRAP_ADMIN_EMAIL`/`_PASSWORD` create the super admin at startup, since
    a migration cannot hash a password it is not allowed to read.
41. **2026-11-17 — Module DTOs use camelCase JSON.** Both the frontend and the endpoint specification
    use `orgName`, `fullName`, `registrationToken`, `newPassword`, so matching them costs nothing and
    saves a translation layer. The RFC 9457 members keep their specified names (`type`, `title`,
    `status`, `detail`, `instance`, `code`, `errors`, `request_id`), because those are a wire format,
    not this API's vocabulary.
42. **2026-11-17 — Sessions are HttpOnly cookies; the refresh token is `sessionID.secret`.** The
    session id travels in the clear so the server can find the record in one lookup, while only the
    secret's HMAC is stored. Rotation replaces the stored hash inside a Lua script; presenting a
    superseded secret is treated as theft and revokes every session that user has. `Secure` is derived
    from `APP_ENV`, never from its own variable.
43. **2026-11-17 — Access tokens are signed with the global `AUTH_JWT_SECRET`.** Owner's call over the
    spec's per-tenant secret, which would require trusting an unverified claim to choose the
    verification key. `tenant_id` is a verified claim instead, and `tenants.jwt_secret` stays reserved
    for storefront visitor tokens. JWT validation uses the service's injected clock, so token-expiry
    behaviour is testable without sleeping.
44. **2026-11-17 — Transaction-bound events go through the outbox; the rest are published directly.**
    `auth.user_registered` and `auth.password_changed` are written to `outbox_events` in the same
    transaction as the row they describe. OTP and reset e-mails have no row to ride along with, so they
    are published straight to the stream and a publish failure returns 503 — the spec's rule that a
    queue failure must never be reported as a sent e-mail.
45. **2026-11-17 — Supersedes 35: Go source carries no comments at all** (extended 2026-11-18 to the
    env templates and `compose.yaml`; what each variable means is documented under **Environment
    variables** in this file instead).** Owner's instruction. Not
    even doc comments on exported identifiers; only `//go:*` and `//nolint` directives remain, with no
    trailing prose. Every existing file was rewritten through `go/printer` with its comment list
    filtered, so the change is mechanical and the formatting is `gofmt`-stable.

46. **2026-11-17 — Organization names are case-insensitive, and e-mail format is validated after
    normalization.** Both came out of the end-to-end run. `tenants.name` is now `CITEXT` with a
    `char_length <= 80` CHECK, so "Ryuga System" and "ryuga   system" collide in the database rather
    than in application code alone (whitespace is still collapsed in Go). E-mail format is no longer a
    `binding:"email"` tag: gin validates the raw payload, which rejected a perfectly good address that
    merely carried surrounding whitespace. The DTO now only bounds length, and the service validates
    the **normalized** address with `net/mail`, so trimming and lower-casing happen before the rule is
    applied. Two regression tests cover it.

47. **2026-11-18 — Local dependencies run from `backend/compose.yaml`, with MinIO from the Bitnami
    image.** `minio/minio` and `minio/mc` are no longer publicly pullable from Docker Hub — those
    repositories return no tags at all — so the pinned `bitnamilegacy/minio:2025.7.23-debian-12-r5`
    build stands in. Same MinIO server; it creates the bucket from `MINIO_DEFAULT_BUCKETS`, which
    removes the need for an `mc` init container. Revisit when MinIO publishes a pullable image again.
    Every port binds to `127.0.0.1` so a laptop on a shared network does not expose Postgres.

48. **2026-11-18 — Dashboard access tokens are signed per tenant.** Owner's call, reversing 43 after
    it was built the other way. Each tenant's `jwt_secret` is the root; the token is signed with
    `HMAC(jwt_secret, "ryugaware:dashboard-token:v1")` and carries `aud: ryugaware-dashboard`, so a
    storefront token minted from the same tenant secret under a different derivation and audience can
    never authenticate a dashboard request. Verification reads `tenant_id` from the **unverified**
    token purely to select the key — the one claim trusted before a signature, bounded by: it must
    parse as a UUID, nothing else is read, and the verified claim is compared against it afterwards.
    Keys are cached in Redis (`t:{tenant}:signing-key`) for `AUTH_TENANT_KEY_CACHE_TTL`, with a short
    negative entry for unknown tenants so a stream of random ids cannot become database load. The
    blast radius of one leaked key is now a single tenant; the costs are a key lookup per request
    (cached), a five-minute window in which a deactivated tenant's tokens still verify, and no rotation
    endpoint yet — both recorded under **Known gaps**.

49. **2026-11-18 — `AUTH_JWT_SECRET` renamed to `AUTH_TOKEN_HMAC_SECRET`.** After 48 the name was a
    lie: it signs no JWT. What it still does is hash the tenant-agnostic secrets, and it has to be
    service-wide because each of them is looked up *before* the tenant is known — an OTP and a
    registration proof exist before the tenant row does, a refresh token is hashed to find its session,
    and a reset token is hashed to find its user. A per-tenant key cannot hash a value whose whole
    purpose is to tell you which tenant you are dealing with. Renaming now is free (nothing is
    deployed); the `Auth.TokenHMACSecret` field, the production length check and both env files moved
    with it.

50. **2026-11-18 — The notification worker is a stream consumer, not a cron.** `notification-worker`
    is a Redis consumer group reading `notification.email_requested`: render → send → record →
    `XACK`, in that order, so a crash before the ack redelivers rather than losing the mail. A failed
    send leaves the message pending; `XPENDING`/`XCLAIM` reclaim it after `EVENTS_CLAIM_MIN_IDLE`, and
    past `EVENTS_MAX_RETRIES` it is copied to the DLQ with its attempt count and acked, so one poison
    pill cannot stall the group. Idempotency is a unique `event_id` in `email_deliveries`, checked
    before sending — at-least-once delivery, at-most-once mail except for a crash between send and
    record.
51. **2026-11-18 — The platform `password_reset` template now sends a link, not a code.** The seeded
    template asked for `{{otp}}`, but the implemented flow issues a URL token and the frontend's
    `/reset-password` page reads `?token=`. Changing the template (migration 2) was the only option
    that did not break the already-integrated frontend. The OTP body is restored by the `down`
    migration. Verification still uses a code; only the reset mail changed.
52. **2026-11-18 — A fact and the mail it triggers are two separate events.** `auth.user_registered`
    stays a pure fact for the audit trail, and the welcome mail is its own
    `notification.email_requested` row written in the same transaction (same for password changes).
    The alternative — teaching the notification worker to interpret auth facts — would put auth's
    vocabulary inside another module and make every new fact a notification concern. Payload keys now
    match each template's declared `variables` exactly, so a renderer miss is a bug, not a shrug.

---

## Build log

*Append-only. Newest last.*

- **2026-11-13** — Stage 1: `go mod init`, directory skeleton, deps resolved.
- **2026-11-13** — Stage 2: `internal/config` (`config.go`, `loader.go`). Validated at startup.
- **2026-11-13** — Stage 3: `internal/platform/logger` on `log/slog`.
- **2026-11-13** — Stage 4: `internal/shared/apperrors`, `internal/shared/response`.
- **2026-11-13** — Stage 5a: `internal/platform/database` (pool, GORM slog logger,
  driver error classification) and `cmd/migrate`.
- **2026-11-17** — Stage 5b: `migrations/embed.go` + migrations 1–6, the login and
  registration schema (`organizations`, `roles`, `privileges`, `role_privileges`,
  `users`, `refresh_tokens`, `email_templates`). `cmd/migrate` did not compile
  before this: it imports the `migrations` package, which had no Go file.
  Applied, exercised and rolled back against Postgres 17 in a throwaway container.
- **2026-11-17** — Stripped all comments and all non-unique indexes from the six
  migrations per owner request; re-verified against a fresh Postgres 17.
- **2026-11-17** — Renamed `users` → `platform_users`, deleted the
  `refresh_tokens` migration (sessions are Redis-only) and renumbered
  `email_templates` to 5. Rebuilt the five platform e-mail templates on a shared
  responsive shell using the `@theme` palette from `frontend/DESIGN.md`.
  Re-verified on Postgres 17: 11 behavioural checks pass, every template's
  `{{variables}}` match its declared `variables` JSONB and its tags balance,
  `up`/`down 5`/`up` is clean and all 14 indexes are unique.
- **2026-11-17** — Renamed `organizations` → `tenants` (and every
  `organization_id` → `tenant_id`), added the `licenses` table with the default
  entitlement (1 website, 10 GiB, 1 year), and merged migrations 1–5 into a
  single `000001_init.{up,down}.sql`. Verified on a throwaway Postgres 17:
  `up` → `down` → `up` is clean with no leftover tables, indexes or extensions;
  licence defaults read back as `default` / 1 / 10 GB / 365 days; deleting a
  tenant cascades its licence; the renamed composite FK
  `platform_users_role_same_tenant_fkey` is in place; all 16 indexes are unique
  or primary keys; 22 privileges and 5 templates still seed. `go build`,
  `go vet`, `gofmt` clean.
- **2026-11-17** — Added six path-scoped rule files under `.claude/rules/`
  (architecture, multitenancy, api, persistence, security, testing) and three skills
  under `.claude/skills/` (`backend-endpoint`, `backend-migration`, `backend-module`),
  grounded in the actual source rather than the plan: the layer rules cite
  `database.Is*`/`InTransaction`, `logger` redaction and `response.Error` as they are
  written. **No Go code, schema or configuration changed in this task**; the gaps the
  rules expose (frontend/backend response-shape mismatch, missing `middleware`
  package, missing Redis key builder, no RLS, no idempotency) are recorded under
  **Known gaps**. YAML frontmatter of all nine files parsed and verified; path globs
  checked against the real directory layout. `AGENTS.md` gained a four-line pointer to
  the rules directory (no rule text duplicated). `go build`, `go vet`, `gofmt` and
  `go test ./...` re-run clean — the test run reports "no test files", as before.
- **2026-11-17** — Adopted RFC 9457 and cursor pagination after the owner restated both
  (Decisions 31, 32). **Code changed**: `internal/shared/apperrors` gained `Error.Title()`;
  `internal/shared/response` replaced `ErrorBody`/`ErrorPayload` with `Problem` +
  `InvalidParam`, renamed `Meta` → `PageMeta`, added `CursorMeta`/`NewCursorMeta`, widened
  `Body.Meta` and `List`'s meta parameter to `any`, and now sets the problem media type
  before `c.JSON` (gin writes Content-Type only when unset — verified in
  `gin@v1.12.0/render/render.go`). Added `internal/shared/response/response_test.go`:
  5 cases covering the problem members, the `errors` array with JSON Pointers, the generic
  internal `detail`, cursor meta and the success content type. `.claude/rules/backend-api.md`
  §2 and §5 rewritten accordingly; `backend-testing.md` error-contract case updated.
  `go build ./... && go vet ./... && gofmt -l .` clean; `go test ./...` passes
  (`internal/shared/response` ok, every other package still has no test files).
- **2026-11-17** — Added `.claude/rules/backend-quality.md` (anti-bloat, SOLID, memory,
  timeouts, graceful shutdown, the no-explanatory-comments rule) and
  `.claude/rules/backend-messaging.md` (transactional outbox, relay, consumer groups,
  DLQ). Adjusted `backend-persistence.md` §3 (events now go to the outbox, not a
  post-commit publish) and `backend-api.md` §1/§4 (400 for unparseable bodies, 422 for
  failed validation, with the bind-error classification switch). **Code changed**:
  `apperrors.Status()` maps `validation_failed` to 422; comments added earlier this session
  to `apperrors`, `response` and `response_test.go` were trimmed to one-line doc comments
  per Decision 35. `go build ./... && go vet ./... && gofmt -l .` clean;
  `go test ./...` passes (`internal/shared/response` ok, 5 cases, now asserting 422 for
  validation; every other package still has no test files).
- **2026-11-17** — Built the auth module: 12 endpoints end to end (OTP request/verify/resend,
  register, login, me, refresh, logout, forgot/validate/reset/change password) over new
  `internal/platform/redis`, `internal/platform/messaging` (publisher + outbox relay),
  `internal/shared/middleware`, `internal/shared/binding`, `internal/bootstrap` and `cmd/api`.
  Schema extended in `000001_init` (unique org name, `password_pepper`, `is_active`, `is_platform`,
  nullable `roles.tenant_id` + 3 seeded global roles + privilege mappings, `role_tenant_id` mirror
  column, `outbox_events`, `email_verified_at` dropped) and re-verified on a throwaway Postgres 17:
  seeds land, a global role assigns to any tenant, a foreign custom role is rejected by the composite
  FK, duplicate org names are rejected, `up`/`down`/`up` leaves nothing behind. Added
  `go-redis v9.23.0`, `golang-jwt/jwt v5.3.1`, `google/uuid v1.6.0` and promoted `x/crypto` to a
  direct dependency — the Dependencies table had listed them before they were in `go.mod`.
  **All Go comments were removed repo-wide** (Decision 45) with a `go/printer` pass that keeps
  `//go:*` and `//nolint`. Tests: 31 new auth service cases with hand-written fakes (OTP outcomes,
  proof handling, registration transaction and licence defaults, pepper binding, login failure modes,
  token/password-change invalidation, refresh reuse revocation, reset and change flows, platform-admin
  idempotency) plus the 5 response cases — `go build ./... && go vet ./... && gofmt -l .` clean and
  `go test ./...` green. No integration tests, and no e-mail is delivered yet (see **Known gaps**).
- **2026-11-17** — Ran the whole auth surface against real Postgres 17 and Redis 7 in throwaway
  containers, via `cmd/migrate up` and the built `cmd/api`: migrations apply and seed; `/readyz`
  reports both dependencies; the bootstrap super admin is created in the platform tenant; OTP request
  → verify → register returns 201 and writes tenant + user + licence; the relay drains
  `auth.user_registered` to the stream (status `PUBLISHED`); login sets both HttpOnly cookies and
  `/auth/me` returns the user with its 22 admin privileges; refresh rotates, and replaying the old
  refresh cookie returns 401 **and** kills the rotated session too (family revocation); forgot →
  validate → reset consumes the token, rejects the old password and accepts the new one; logout makes
  `/auth/me` anonymous again. Error paths verified as problem documents: wrong OTP `invalid_otp` 400,
  re-used proof `email_verification_required` 400, duplicate org name
  `organization_name_already_exists` 409, OTP for a registered address `email_already_registered` 409,
  2 MB body `payload_too_large` 413, truncated JSON `bad_request` 400, wrong password `unauthorized`
  401. The run exposed two defects, both fixed and covered by tests (Decision 46): the `binding:"email"`
  tag rejected untrimmed addresses before normalization, and organization names were case-sensitive.
- **2026-11-18** — Added `backend/compose.yaml` (Postgres 17, Redis 7 with AOF, MinIO, Mailpit — all
  health-checked, all bound to localhost, named volumes) and `backend/.env.example` covering every
  variable `internal/config` reads, with values matching the compose services. Verified by bringing
  the stack up: four services healthy, `cmd/migrate up` applies and seeds, the API runs against it and
  `/readyz` returns ok. Then replayed the frontend's exact request sequence with
  `Origin: http://localhost:3000`: the CORS preflight returns the origin with
  `Allow-Credentials: true`, and OTP → verify → register → login → `/auth/me` all succeed with the
  session cookies. **No Go code changed in this step.**
- **2026-11-18** — Switched access-token signing from the global secret to the per-tenant key
  (Decision 48). Added `AUTH_TENANT_KEY_CACHE_TTL`, the derived-key cache in `auth/store`
  (`GetTenantSigningKey` / `SetTenantSigningKey` / `InvalidateTenantSigningKey`), the
  unverified-tenant-id lookup in `auth/service/tokens.go`, and the `aud` claim. `Policy.JWTSecret` is
  gone; `TokenHMACKey` (still derived from `AUTH_JWT_SECRET`) continues to hash OTPs, proofs, refresh
  and reset tokens. Six new tests: a token signed with another tenant's key is rejected, an unknown
  tenant is rejected and its miss cached, the key is served from cache on the second call, an inactive
  tenant is rejected, a same-key token for another audience is rejected, and login's token verifies
  with the tenant key but not with another's. Verified live against the compose stack: the issued
  token carries `aud: ryugaware-dashboard`, Redis holds `ryugaware:t:<id>:signing-key` whose value
  differs from the database secret (derivation working), and login → `/auth/me` → refresh →
  `/auth/me` all pass. `.claude/rules/backend-security.md` §4 now records the unverified-claim
  carve-out. `go build`, `go vet`, `gofmt`, 45 tests: clean.
- **2026-11-18** — Stripped the comments from `.env.example` and the local `.env`, and from
  `compose.yaml`; both env files now carry the same 96 keys, including `AUTH_TENANT_KEY_CACHE_TTL`,
  which the local `.env` was missing after the per-tenant signing change. The no-comments convention
  now covers env templates and YAML as well as Go (Decision 45). `cmd/migrate version` still loads the
  configuration and reports `version=1 dirty=false`.
- **2026-11-18** — Renamed `AUTH_JWT_SECRET` → `AUTH_TOKEN_HMAC_SECRET` across `internal/config`
  (field, loader key, both validation messages, `minHMACSecretLen`), `internal/bootstrap` and
  `.env.example`. `go build`, `go vet`, `gofmt` clean; 45 tests pass. **The local `backend/.env` could
  not be edited** — the sandbox blocks rewriting the file that holds the real secret — so that one line
  still reads `AUTH_JWT_SECRET=` and the API will refuse to start until it is renamed by hand.
- **2026-11-18** — Added `.claude/rules/ask-before-assuming.md` (no `paths`, so it loads in every
  session): design doubts and assumptions about naming, contracts, schema, security and scope go to
  the owner as one batch of costed options before any code is written; only reversible details with an
  obvious default are decided alone. It names the calls in this project that had to be undone, so the
  rule carries its own evidence. Documentation only — no code changed.
- **2026-11-18** — Built the e-mail worker and started it with the application. New:
  `internal/platform/email` (stdlib SMTP: none/STARTTLS/TLS, auth, deadlines, base64 HTML body),
  `internal/platform/messaging/consumer.go` (consumer group, ack-after-success, `XPENDING`/`XCLAIM`
  recovery, DLQ past `EVENTS_MAX_RETRIES`), `internal/modules/notification`
  (model/repository/service: tenant-overriding template lookup, `{{placeholder}}` renderer with HTML
  escaping, `email_deliveries` recording, stream handler), and migration 2
  (`email_deliveries` + the link-based `password_reset` template). Auth now emits payload keys that
  match each template's variables and writes a separate `notification.email_requested` row for the
  welcome and password-changed mails. Bootstrap starts the worker alongside the relay under
  `EVENTS_WORKERS_ENABLED` and stops it with the server. 7 new tests (rendering + escaping + missing
  variables, event filtering, tenant template preference, redelivery idempotency, failure recording,
  unknown template) bring the suite to 52. **Verified against the live stack**: the worker drained the
  4 events that had been stuck in the stream, then OTP → verify → register → forgot-password produced
  three real messages in Mailpit (verification, welcome, reset) with no placeholders left, the code
  visible in the body, a working `http://localhost:3000/reset-password?token=…` link, five `SENT` rows
  in `email_deliveries` and zero pending messages in the group.
- **2026-11-18** — Removed 21 empty placeholder directories left from the original skeleton
  (`modules/admin/*`, `modules/audit/*`, the unused `notification/{dto,handler,template,worker}`,
  `platform/storage`, `shared/validate`, `deployments`, `scripts`, `tests/{integration,testdata}`,
  `.github/workflows`). None contained a Go file, so no package changed and the build is unaffected;
  git never tracked them. They are recreated when the code that belongs in them is written.
