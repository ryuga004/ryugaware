# Ryugaware Backend — Agent Rules

Go modular monolith. Read `PROJECT_STATE.md` first — it is the source of truth for
what exists, what is wired, and what is left. Do not re-read the whole codebase to
rebuild context; read the state file, then open only the files you are changing.

The enforceable engineering detail lives in path-scoped rules in `.claude/rules/`
(`backend-architecture`, `backend-multitenancy`, `backend-api`, `backend-persistence`,
`backend-security`, `backend-testing`); they load automatically when a matching file is
touched. This file keeps Rule 0 and the summary — do not duplicate the rules here.

---

## Rule 0 — Keep `PROJECT_STATE.md` current (mandatory)

**After every change that touches code, config, schema, infrastructure or docs,
update `backend/PROJECT_STATE.md` in the same turn, before reporting completion.**

Update these parts of it:

| You changed | Update in `PROJECT_STATE.md` |
|---|---|
| Added/removed/renamed a package or file | **Package map** |
| Added/changed an endpoint | **HTTP surface** |
| Added/changed a DB table or migration | **Data model** + **Migrations** |
| Added/changed an event type | **Event catalog** |
| Added/changed an env var | **Environment variables** |
| Wired a new dependency in bootstrap | **Wiring graph** |
| Added a dependency to `go.mod` | **Dependencies** |
| Finished or started a build stage | **Build log** + **Status** |
| Made a decision with trade-offs | **Decision log** |

Rules for the file itself:
- It records **current state**, not narrative history. Rewrite stale lines; don't append corrections.
- The **Build log** and **Decision log** are the only append-only sections.
- Every claim in it must be true of the code at that commit. If you are unsure, verify before writing.
- Keep it skimmable: tables and short bullets, no prose essays, no code dumps.
- If a change invalidates something written there, fix that line even if unrelated to your task.

---

## Architecture rules

**Modular Monolith + package-by-feature + layered.** Modules: `auth`, `admin`, `audit`, `notification`.

Dependency flow is one-way: `handler → service → repository → database`.

1. Handlers must not touch repositories or the DB directly.
2. Services must not depend on `*gin.Context` (take `context.Context` + typed params).
3. Repositories own all queries. No SQL or GORM calls outside `repository/`.
4. DTOs are never GORM models, and models are never returned from handlers.
5. A module must not import another module's `repository` package.
6. Cross-module calls go through an interface **defined in the consuming package**
   and implemented by the providing module's service, wired in `bootstrap`.
   Otherwise, communicate by event.
7. Keep interfaces small and defined next to their consumer. No interface without
   a second implementation or a test double that needs it.
8. No generic base repository, no DI framework, no global mutable state.
9. Business modules never read environment variables — bootstrap injects typed config.
10. Avoid circular package imports; if two modules need each other, invert with an
    interface or an event.

## Platform rules

- **Postgres/GORM**: context-aware calls only (`WithContext`). No `AutoMigrate` —
  schema changes are versioned SQL in `migrations/`, applied by `cmd/migrate`.
- **Redis**: all keys namespaced with the configured prefix; every key has a TTL
  unless it is a stream. Pub/Sub only for droppable signals, never durable work.
- **Redis Streams**: consumer groups, ack only after success, bounded retries,
  pending recovery, DLQ. Consumers must be idempotent (DB unique constraint on
  `event_id` is the mechanism).
- **Storage**: modules depend on the `storage.Store` interface, never the AWS SDK.
  Presigned URLs must use the public endpoint, never a Docker-internal hostname.
- **Email**: never sent from a handler. Handlers/services publish an event; the
  notification worker sends.
- **Errors**: services return `*apperrors.Error`; only `response.Error` maps to HTTP.
- **Logging**: `log/slog`, structured, request id on every request log. Never log
  passwords, tokens or secrets.

## Working rules

- Build incrementally. After each stage: `go build ./... && go vet ./... && gofmt -l .`
  must be clean, and unit tests must pass.
- No placeholder implementations that look production-ready. If something is a
  stub, say so in `PROJECT_STATE.md` under **Known gaps**.
- Unit tests must not require Docker. Integration tests are behind the
  `integration` build tag and skip when their service env vars are unset.
- Prefer the standard library. Justify every new dependency in the **Decision log**.
