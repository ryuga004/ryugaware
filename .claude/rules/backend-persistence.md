---
paths:
  - "backend/internal/modules/**/repository/**/*.go"
  - "backend/internal/modules/**/model/**/*.go"
  - "backend/internal/platform/database/**/*.go"
  - "backend/migrations/*.sql"
---

# Persistence rules

GORM, Postgres and migrations. Tenant predicates are covered in `backend-multitenancy.md` §2 and are
assumed here.

## 1. Repository layer

- Every GORM call starts with `.WithContext(ctx)`. A query without it ignores cancellation and the
  statement timeout.
- Repositories expose intent-named methods (`ListActiveByTenant`, `MarkEmailVerified`), not a generic
  `Find(any)`. No generic base repository, no `interface{}` filters.
- Return domain-shaped results and wrapped errors. Translate driver specifics with the helpers that
  already exist in `internal/platform/database`:

```go
if err := r.db.WithContext(ctx).Create(&u).Error; err != nil {
    if database.IsUniqueViolation(err) && database.ConstraintName(err) == "platform_users_email_key" {
        return apperrors.Conflict("that email is already registered")
    }
    return apperrors.Internal(fmt.Errorf("auth: create user: %w", err))
}
```

- `database.IsNotFound`, `IsUniqueViolation`, `IsForeignKeyViolation`, `IsConstraintViolation` and
  `ConstraintName` are the only acceptable way to classify a driver error. No string matching on
  `err.Error()`, no `strings.Contains(err.Error(), "duplicate key")`.
- A unique-constraint violation that the user can cause is a `conflict` or a `validation_failed`, never
  an `internal_error`.
- No business decisions in a repository: no entitlement checks, no event publishing, no e-mail, no
  Redis orchestration.

## 2. Query safety

- Parameterised queries only. Never build SQL by concatenating or formatting untrusted input — not in
  `Where`, not in `Raw`, not in `Order`.
- `Raw`/`Exec` need a comment saying why GORM's builder could not express it, and still use `?`
  placeholders.
- Dynamic identifiers (sort column, filter column, table) come from a **hardcoded allowlist map** in the
  repository, never from the request string:

```go
// GOOD
var sortable = map[string]string{"created_at": "created_at", "name": "name"}
col, ok := sortable[in.Sort]
if !ok { return apperrors.Validation("unknown sort field") }
q = q.Order(col + " DESC, id DESC")

// BAD — SQL injection through the order clause
q = q.Order(in.Sort + " " + in.Dir)
```

- Every list query has a `LIMIT`. No unbounded `Find(&all)` on a tenant-scoped table.
- Writes name their columns: `Updates(map[string]any{...})` or `Select(...).Updates(...)`. A bare
  `Save(&model)` rewrites every column, including ones the caller never loaded.
- No `AutoMigrate`, ever. No GORM callbacks/plugins that mutate queries globally.

## 3. Transactions

- Use `database.InTransaction(ctx, db, func(tx *gorm.DB) error { … })`. The repository methods inside it
  take the `tx`, not the pool.
- A transaction spans one tenant and one logical unit of work. Keep it short.
- Never perform network I/O inside a transaction: no HTTP calls, no S3 upload, no SMTP, no Redis
  round-trip that the commit depends on. Events are written to the outbox table in the same
  transaction and relayed afterwards — see `backend-messaging.md` §1.
- Registration-style flows (tenant + licence + roles + role_privileges + user) are a single
  transaction: a partial tenant must not be observable.
- Expect retries on serialization failures only where the isolation level makes them possible; do not
  wrap every call in a retry loop.

## 4. Models

- GORM structs live in `model/`, carry no JSON tags, and never leave the module.
- Column types mirror the migration exactly (`uuid.UUID`, `time.Time`, `*time.Time` for nullable).
- Timestamps are set by the application, not by database triggers.
- A model never holds a decrypted secret or a raw token; store a hash (see `backend-security.md` §5).

## 5. Migrations

- Versioned SQL pairs in `backend/migrations/NNNNNN_name.{up,down}.sql`, embedded via `embed.go`,
  applied only by `cmd/migrate`. The current schema is a single `000001_init` pair.
- **Never edit a migration that has been applied anywhere real.** Add the next numbered pair instead.
- Every `up` has a `down` that undoes it exactly: after `up → down → up`, no stray table, index,
  constraint, extension or seed row remains.
- The SQL carries no comments (project convention) — the rationale goes in the Decision log.
- Constraints are the schema's job: `NOT NULL`, `CHECK`, composite `UNIQUE`, composite FKs with the
  right `ON DELETE`. Do not enforce in Go what the database can enforce.
- Index policy: today every index backs a primary key or a uniqueness constraint. A performance index
  arrives in its own migration, with the query it serves named in `PROJECT_STATE.md`. Do not add
  speculative indexes — each one costs write throughput.
- Seed data in a migration is for fixed platform catalogs only (`privileges`, platform e-mail
  templates). Tenant rows are never seeded by a migration.
- Verify before claiming it works, against a throwaway Postgres 17 container: `up`, inspect, `down`,
  check for leftovers, `up` again. Then update **Data model** + **Migrations** in `PROJECT_STATE.md`.

## 6. Before you…

- **add a query** — confirm the tenant predicate, the `LIMIT`, the `ORDER BY` tie-breaker and
  `WithContext`.
- **add a column** — write the migration pair first, then the model, then the DTO mapping; nullable in
  Go means a pointer.
- **add an index** — name the query, check the column order (tenant first), and justify it in the
  Decision log.
- **touch a constraint** — check which composite FK or partial unique index already covers it.
