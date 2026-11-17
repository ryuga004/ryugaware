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
| 6 | `internal/platform/redis` | ⬜ not started |
| 7 | `internal/platform/storage` (S3/MinIO) | ⬜ not started |
| 8 | `internal/platform/email` (SMTP/Mailpit) | ⬜ not started |
| 9 | `internal/platform/messaging` (Redis Streams) | ⬜ not started |
| 10 | `internal/bootstrap` + `cmd/api` lifecycle | ⬜ not started |
| 11 | `auth` module | ⬜ not started |
| 12 | `admin` module | ⬜ not started |
| 13 | `audit` module + consumer | ⬜ not started |
| 14 | `notification` module + e-mail worker | ⬜ not started |
| 15 | `internal/shared/middleware` + route registration | ⬜ not started |
| 16 | Unit + integration tests | ⬜ not started |
| 17 | Dockerfile + compose | ⬜ not started |
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
| `internal/shared/apperrors` | `*Error` with `Code`, client-safe `Message`, wrapped cause, `Status()` | ✅ |
| `internal/shared/response` | `Body`/`ErrorBody` envelopes, `OK/Created/List/Error`, pagination `Meta` | ✅ |
| `internal/platform/database` | GORM pool (`New`/`Ping`/`Close`), slog GORM logger, driver error classification | ✅ |
| `cmd/migrate` | `up`/`down`/`drop`/`goto`/`force`/`version` over the embedded SQL, waits for Postgres | ✅ |
| `migrations` | `embed.FS` of the versioned SQL read by `cmd/migrate` | ✅ |

Everything else listed under **Architecture** is planned, not yet written.

---

## Error codes (API contract)

`validation_failed` · `bad_request` · `unauthorized` · `forbidden` · `not_found` ·
`conflict` · `payload_too_large` · `rate_limited` · `internal_error` · `service_unavailable`

Response shapes:
- success — `{"data": ..., "meta": {...}?}`
- failure — `{"error": {"code", "message", "details"?, "request_id"?}}`

---

## HTTP surface

Not yet implemented. Planned, all under `/api/v1` except health:

| Method | Path | Auth | Module |
|---|---|---|---|
| GET | `/healthz` · `/readyz` | public | bootstrap |
| POST | `/auth/register` · `/auth/login` · `/auth/refresh` · `/auth/logout` | public | auth |
| POST | `/auth/verify-email` · `/auth/password/forgot` · `/auth/password/reset` | public | auth |
| GET | `/auth/me` · `/auth/sessions` | user | auth |
| POST | `/auth/password/change` · `/auth/me/avatar` (+ presign/delete) | user | auth |
| GET | `/admin/users` · `/admin/users/:id` | admin | admin |
| POST | `/admin/users/:id/activate` · `/deactivate` | admin | admin |
| GET/POST | `/admin/roles` · PUT `/admin/users/:id/roles` | admin | admin |
| GET | `/admin/audit-events` | admin | audit |
| GET | `/admin/notifications` · POST `/admin/notifications/test` | admin | notification |

---

## Data model

Live tables (login + registration only). All PKs are `UUID DEFAULT gen_random_uuid()`;
all timestamps are `TIMESTAMPTZ` and are set by the application, not by triggers.

| Table | Owner | Key columns | Notes |
|---|---|---|---|
| `organizations` | auth | `name` (80, **not** unique), `jwt_secret` | The tenant. `jwt_secret` signs *storefront* tokens, never dashboard JWTs |
| `roles` | admin | `organization_id`, `name`, `type` | `type ∈ owner\|admin\|member\|custom`; one built-in of each type per org (partial unique index), many `custom`. Extra `UNIQUE (id, organization_id)` exists only to back the users FK |
| `privileges` | admin | `name` (`resource.action`, unique), `type` | Fixed platform catalog, seeded by migration. 22 rows |
| `role_privileges` | admin | PK `(role_id, privilege_id)` | |
| `platform_users` | auth | `organization_id`, `role_id` (NOT NULL), `full_name` (80), `email` CITEXT UNIQUE, `password_hash`, `email_verified_at`, `password_changed_at`, `last_login_at`, `is_active` | `email_verified_at IS NULL` ⇒ login refused. Composite FK `(role_id, organization_id) → roles` blocks cross-tenant role assignment |
| `email_templates` | notification | `organization_id` (**nullable**), `name`, `subject`, `body`, `variables` JSONB | `organization_id IS NULL` = platform default; a tenant row of the same name overrides it. Two partial unique indexes, because `NULL ≠ NULL` in a plain unique index |

Deleting an `organizations` row removes the whole tenant by cascade (verified).

**Sessions are not in Postgres.** Refresh tokens live only in Redis — see the
Decision log. There is no `refresh_tokens` table.

**No performance indexes exist.** Every index in the schema backs a primary key
or a uniqueness constraint; non-unique indexes are added by a later migration
when a query needs one. Foreign-key columns (`platform_users.organization_id`,
`platform_users.role_id`, `role_privileges.privilege_id`,
`email_templates.organization_id`) are therefore **unindexed**, which makes
cascading deletes and reverse lookups sequential scans.

Planned, not yet created: `email_verification_tokens`, `password_reset_tokens`
(auth), `audit_events` and `email_deliveries` (both unique on `event_id` for
consumer idempotency).

## Migrations

`migrations/` holds versioned `NNNNNN_name.{up,down}.sql`, embedded via
`migrations/embed.go` into `cmd/migrate`. **`AutoMigrate` is never used.**

| Version | File | Creates |
|---|---|---|
| 1 | `extensions` | `citext`, `pgcrypto` |
| 2 | `organizations` | `organizations` |
| 3 | `roles_privileges` | `roles`, `privileges`, `role_privileges` + privilege catalog seed |
| 4 | `platform_users` | `platform_users` |
| 5 | `email_templates` | `email_templates` + 5 platform default templates |

The SQL carries no comments, by request.

Verified against Postgres 17: `up` → `down 5` → `up` leaves no stray objects and
re-running `up` reports *no change*.

---

## Event catalog

Transport: Redis Streams, one stream `ryugaware:events:v1`, DLQ `…:v1:dlq`.
Envelope: `event_id`, `event_type`, `event_version`, `source`, `occurred_at`, `payload`, `metadata`.

| Event | Producer | Consumers |
|---|---|---|
| `auth.user_registered` | auth | audit |
| `auth.user_logged_in` / `auth.user_login_failed` | auth | audit |
| `auth.email_verified` / `auth.password_changed` | auth | audit |
| `auth.password_reset_requested` | auth | audit |
| `auth.user_activated` / `auth.user_deactivated` | auth | audit |
| `admin.role_created` / `admin.role_updated` | admin | audit |
| `admin.user_roles_updated` | admin | audit, (role cache invalidation) |
| `notification.email_requested` | auth, admin | notification |
| `notification.email_sent` / `notification.email_failed` | notification | audit |
| `audit.event_created` | audit | **Pub/Sub only** — droppable live signal |

Consumer groups: `audit-worker`, `notification-worker`. Each filters by event type.

Secrets (verification/reset tokens) travel only in `notification.email_requested`
payloads and are never written to `audit_events`.

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
| `AUTH_` | `JWT_SECRET`, `JWT_ISSUER`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `BCRYPT_COST`, `EMAIL_VERIFICATION_TTL`, `PASSWORD_RESET_TTL`, `MAX_ACTIVE_SESSIONS`, `LOGIN_RATE_LIMIT`, `LOGIN_RATE_WINDOW`, `ROLES_CACHE_TTL`, `BOOTSTRAP_ADMIN_EMAIL` |
| `EVENTS_` | `STREAM`, `DLQ_STREAM`, `STREAM_MAXLEN`, `LIVE_CHANNEL`, `BATCH_SIZE`, `BLOCK_TIMEOUT`, `MAX_RETRIES`, `CLAIM_MIN_IDLE`, `CLAIM_INTERVAL`, `HANDLER_TIMEOUT`, `WORKERS_ENABLED` |
| misc | `ENV_FILE` (overrides which dotenv file is read) |

Required with no safe default: `AUTH_JWT_SECRET`. Production additionally rejects
a short JWT secret, `POSTGRES_SSLMODE=disable`, empty DB password, plaintext SMTP,
`STORAGE_PROVIDER != s3`, non-JSON logs, and `CORS *` + credentials.

---

## Dependencies

| Module | Version | Used for |
|---|---|---|
| `github.com/gin-gonic/gin` | v1.12.0 | HTTP router |
| `gorm.io/gorm` + `gorm.io/driver/postgres` | v1.31.2 / v1.6.3 | ORM |
| `github.com/redis/go-redis/v9` | v9.23.0 | cache + streams |
| `github.com/golang-migrate/migrate/v4` | v4.20.1 | versioned migrations |
| `github.com/jackc/pgx/v5` | v5.10.0 | `database/sql` driver for `cmd/migrate`; GORM's Postgres driver uses it too |
| `github.com/aws/aws-sdk-go-v2/{config,credentials,service/s3}` | s3 v1.114.10 | object storage |
| `github.com/golang-jwt/jwt/v5` | v5.3.1 | access tokens |
| `github.com/google/uuid` | v1.6.0 | ids |
| `github.com/joho/godotenv` | v1.5.1 | `.env` for local dev |
| `golang.org/x/crypto` | v0.59.0 | bcrypt |

Tests use the standard library only — no testify.

---

## Wiring graph

`bootstrap` is the only place constructors are called. Not yet written. Planned order:
config → logger → postgres → redis → storage → smtp → event bus → repositories →
services → handlers → routes → workers → HTTP server → graceful shutdown.

---

## Known gaps

- Everything from Stage 6 onward is unwritten (see **Status**).
- **Schema covers login + registration only.** No e-mail verification or password
  reset token tables yet, so `users.email_verified_at` can currently only be set
  by hand. The frontend's verify-email and reset-password flows have no backend.
- **Built-in role → privilege grants are applied by the application, not by the
  migration.** Roles are per-organization, so registration must insert the three
  built-in roles and their `role_privileges` rows inside the registration
  transaction. That mapping lives in Go; nothing in the database enforces that an
  org's "Owner" role actually holds every privilege.
- `AUTH_BOOTSTRAP_ADMIN_EMAIL` is documented in `internal/config` as "granted the
  admin role by migration seed", but migrations cannot read the environment. It
  is unimplemented; bootstrap will have to do it.
- `organizations.jwt_secret` is generated and unique but **nothing reads it yet**.
  It is reserved for storefront visitor tokens.
- **No performance indexes** (see **Data model**). The FK columns listed there are
  unindexed, so every cascade and reverse lookup is a sequential scan. Fine at
  current row counts; add indexes in a new migration before this carries load.
- **Sessions depend entirely on Redis.** With no `refresh_tokens` table, a Redis
  flush or a restart without persistence signs every user out, and the active
  sessions list is gone with it. Redis must run with AOF (or RDB) persistence.
  There is also no database-side record of a sign-in for audit — that has to come
  from `auth.user_logged_in` events landing in `audit_events`.
- `cmd/migrate drop` succeeds but then exits 1: it reads the version after
  dropping `schema_migrations`. Cosmetic, development-only, not yet fixed.
- `internal/platform/database` is written but not wired — `bootstrap` is empty, so
  nothing opens the pool at runtime.
- `.env.example`, `Makefile`, `Dockerfile`, `compose.yaml`, CI workflows, README: not written.
- No tests yet.

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
10. **2026-11-17 — Roles are per-organization, privileges are global.** Privilege
    names are checked by the code, so they must be identical for every tenant and
    are seeded by migration. Role *names* are tenant-visible labels, so tenants
    own them and can later add `custom` roles.
11. **2026-11-17 — Cross-tenant role assignment is blocked by a composite FK**
    `users (role_id, organization_id) → roles (id, organization_id)`, not by an
    application check. A plain `REFERENCES roles(id)` would let one bug assign
    another tenant's role — a privilege escalation nothing in the code would catch.
12. **2026-11-17 — That FK is `ON DELETE NO ACTION`, not `RESTRICT`.** Both refuse
    to delete a role that still has users. `RESTRICT` is checked the instant the
    role row is deleted, so deleting an organization — which cascades into roles
    *and* users in one statement — would succeed or fail depending on cascade
    trigger order. `NO ACTION` defers the check to end of statement.
13. **2026-11-17 — No `password_salt` column.** The reference has one; bcrypt
    embeds its salt in the hash, so a second column would be dead weight and an
    invitation to hand-roll hashing later. `VARCHAR(255)` leaves room for argon2id.
14. **2026-11-17 — `email_verified_at TIMESTAMPTZ` instead of a boolean.** One
    column cannot disagree with itself the way a `bool` + `verified_at` pair can.
15. **2026-11-17 — `organizations.name` is not unique.** The reference makes the
    tenant name unique. Rejected: two unrelated customers may legitimately share a
    company name, and the frontend's register flow only reports a conflict on
    e-mail. E-mail is the identity; the organization name is a label.
16. **2026-11-17 — Refresh tokens are stored hashed, in Postgres.** *(Superseded
    by 18 — they live in Redis instead, and the table was removed.)* Without the
    table, logout cannot be enforced, the sessions list has nothing to read, and a
    stolen token stays valid until expiry. Plain SHA-256 is sufficient (the token
    is 256 bits of CSPRNG output, so there is nothing for a slow KDF to protect).
17. **2026-11-17 — `email_templates.organization_id` is nullable: NULL = platform
    default.** The reference scopes every template to a tenant, which has no
    answer for "which template does a brand-new org get?". Two partial unique
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
