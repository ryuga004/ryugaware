---
name: backend-migration
description: Write and verify a Postgres schema migration for the Ryugaware Go backend (versioned up/down pair, tenant constraints, throwaway-container verification, PROJECT_STATE update). Use when asked to add, change or roll back a table, column, index, constraint or seed row under backend/migrations/.
---

# Writing a backend migration

## 1. Orient

Read **Data model**, **Migrations** and **Decision log** in `backend/PROJECT_STATE.md`. The schema is
currently one applied pair: `000001_init.{up,down}.sql`.

## 2. Rules that decide the DDL

- New change = **new numbered pair** `NNNNNN_name.{up,down}.sql`. Never edit a migration that has been
  applied anywhere real; editing is only safe while the schema has never left a throwaway container,
  and that is a Decision log entry.
- Tenant-owned table: `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`.
- Per-tenant uniqueness is composite: `UNIQUE (tenant_id, name)` — never a global unique.
- Prevent cross-tenant relationships in the database with a composite FK, as
  `platform_users (role_id, tenant_id) → roles (id, tenant_id)` already does.
- Push invariants into the schema: `NOT NULL`, `CHECK`, defaults that encode the documented default
  (the licence free plan lives in column defaults).
- `NULL` has meaning only when documented (`email_templates.tenant_id IS NULL` = platform default) and
  then needs partial unique indexes, because `NULL ≠ NULL`.
- Index policy: every index today backs a PK or a uniqueness constraint. A performance index comes in
  its own migration and names the query it serves. Tenant column first in a composite index.
- No comments in the SQL (project convention). No `AutoMigrate`. Timestamps set by the app, not triggers.
- Seeds are for fixed platform catalogs only (`privileges`, platform e-mail templates) — never tenant rows.
- The `down` must undo the `up` exactly, in reverse dependency order.

## 3. Verify against a real Postgres before claiming anything

```bash
cd backend/migrations
docker run -d --rm --name ryuga_mig -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=ryuga postgres:17-alpine
# wait for a real query, not just pg_isready (it answers during init and then restarts)
for i in $(seq 1 60); do docker exec ryuga_mig psql -U postgres -d ryuga -At -c "select 1" >/dev/null 2>&1 && break; sleep 1; done

docker cp 000001_init.up.sql   ryuga_mig:/tmp/up.sql
docker cp 000001_init.down.sql ryuga_mig:/tmp/down.sql
docker exec ryuga_mig psql -U postgres -d ryuga -v ON_ERROR_STOP=1 -q -f /tmp/up.sql      # applies
docker exec -i ryuga_mig psql -U postgres -d ryuga -At   # behaviour checks: defaults, cascades, constraints
docker exec ryuga_mig psql -U postgres -d ryuga -v ON_ERROR_STOP=1 -q -f /tmp/down.sql    # rolls back
# then assert nothing is left behind:
docker exec ryuga_mig psql -U postgres -d ryuga -At -c "SELECT tablename FROM pg_tables WHERE schemaname='public'"
docker exec ryuga_mig psql -U postgres -d ryuga -v ON_ERROR_STOP=1 -q -f /tmp/up.sql      # re-applies cleanly
docker rm -f ryuga_mig
```

Use `docker exec -i` with a heredoc when the SQL needs stdin. Check at minimum: column defaults come
out as documented, `ON DELETE CASCADE` removes the dependent rows, each new constraint rejects the row
it is meant to reject, and `down` leaves no table, index or extension behind.

Then confirm the Go side still builds, since `migrations/embed.go` globs `*.sql`:

```bash
cd backend && go build ./... && go vet ./... && gofmt -l .
```

## 4. Update `backend/PROJECT_STATE.md` (Rule 0)

**Data model** (table, key columns, notes) + **Migrations** (version row) always. Add **Decision log**
entries for trade-offs, **Known gaps** for anything the schema permits but nothing enforces yet, and a
**Build log** line recording what was verified and how.

## 5. Report

Say exactly which checks ran against which Postgres version, and what they showed. If Docker was not
available, say the migration is unverified — do not imply otherwise.
