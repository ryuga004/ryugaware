---
paths:
  - "backend/internal/**/*.go"
  - "backend/migrations/*.sql"
  - "backend/tests/**/*.go"
---

# Tenant isolation rules

Ryugaware is multi-tenant on a shared schema: every tenant-owned row carries `tenant_id`
(the `tenants` table is the customer account). **Tenant isolation is a security invariant, not a
feature.** A query that can return another tenant's row is a vulnerability even if no UI reaches it.

## 1. Where tenant identity comes from

- The authenticated session only — resolved by middleware from the verified session/JWT, then carried
  in `context.Context` and passed explicitly as a parameter.
- **Never** from a request body field, path/query parameter, `X-Tenant` header, cookie written by the
  client, or a JWT whose signature has not been verified.
- Storefront traffic resolves a tenant from the host/domain. That is *delivery identification* for
  public content, and it grants **no** admin authority: never reuse it to authorize a dashboard
  operation or to pick the tenant for a write on a platform table.
- A handler must not read a tenant id out of the DTO. If a payload contains one, ignore it; binding a
  client-supplied `tenant_id` into a model is mass assignment (see `backend-api.md` §3).

## 2. Repositories carry the predicate

Tenant scoping belongs in the SQL, not in an `if` after the row is loaded.

```go
// GOOD — tenant is part of the lookup; a foreign id simply does not match
func (r *repo) GetWebsite(ctx context.Context, tenantID, id uuid.UUID) (*model.Website, error) {
    var w model.Website
    err := r.db.WithContext(ctx).
        Where("id = ? AND tenant_id = ?", id, tenantID).
        First(&w).Error
    ...
}

// BAD — global fetch plus an application check: one early return away from a leak,
// and it still burns a row read on another tenant's data
func (r *repo) GetWebsite(ctx context.Context, id uuid.UUID) (*model.Website, error)
```

Rules:

- Signature shape for every tenant-owned method: `(ctx, tenantID, …)`. No exceptions for "internal"
  helpers — they get called from a handler eventually.
- `SELECT`, `UPDATE`, `DELETE`, counts, aggregates, `EXISTS` and bulk operations all carry the
  predicate. For writes, the predicate contains **both** the resource id and the tenant id.
- After an `UPDATE`/`DELETE`, check `RowsAffected == 0` and return not-found. Do not assume success.
- Joins carry the tenant predicate on the **joined** table too, not only the driving table. A join to a
  table that has no `tenant_id` must reach it through a column that does.
- One transaction serves one tenant. Never batch work for several tenants in a single transaction.
- GORM scopes, hooks and callbacks may reduce repetition but are **not** the security boundary: a
  forgotten `.Scopes(...)` is silent. The explicit `Where` is the boundary.
- Platform-global tables (`privileges`, platform-default `email_templates` where `tenant_id IS NULL`)
  are the documented exception. Their repository methods say so in a comment.

## 3. Database-level reinforcement

- Uniqueness that is per-tenant is a **composite** unique constraint (`UNIQUE (tenant_id, name)`), never
  a global one.
- Relationships between tenant-owned tables use composite foreign keys where a cross-tenant row would
  otherwise be representable — the pattern already in the schema is
  `platform_users (role_id, tenant_id) → roles (id, tenant_id)`.
- Indexes follow real query patterns: a tenant-scoped list query wants `(tenant_id, <filter/sort col>)`,
  with the tenant column first. Do not add an index without naming the query it serves in the migration
  and in `PROJECT_STATE.md`.
- Row-Level Security is **not** in use. It is worth adding only as defense in depth, and only with
  transaction-scoped `SET LOCAL` (a session-level `SET` leaks across a pooled connection) plus
  `FORCE ROW LEVEL SECURITY` and a non-owner application role. It would never replace §2.

## 4. Responding to an out-of-scope resource

| Situation | Status | Why |
|---|---|---|
| Resource belongs to another tenant | `404` (`not_found`) | Its existence is not the caller's business; a `403` confirms the id is real |
| Resource is in the caller's tenant, caller lacks the privilege | `403` (`forbidden`) | Existence is already known to the caller |
| No authenticated session | `401` (`unauthorized`) | |

A denial is logged server-side with tenant id, user id, resource id and request id even when the client
sees `404`. The same rule applies to nested routes (`/websites/:id/pages/:pageID`), to search, filter
and count endpoints, and to any endpoint that accepts an id in a body.

## 5. Redis keys

- Keys are built by the central key helpers in `internal/platform/redis` (**not yet written** — create
  it there when the first key is needed; do not hand-roll keys in a module).
- Every key starts with the configured `REDIS_KEY_PREFIX`, then a namespace segment that states its
  scope: `t:<tenant_id>:…` tenant-owned, `u:<user_id>:…` user-owned, `g:…` platform-global,
  `p:<host>:…` public storefront delivery.
- A cached value derived from tenant-owned data **must** have the tenant id in its key. Caching a list
  under a key without the tenant id is cross-tenant data disclosure on the next request.
- Every key has a TTL unless it is a stream. Invalidate by writing an explicit delete next to the write
  that invalidates it; do not rely on `KEYS`/`SCAN` sweeps in request paths.

## 6. Tests that must exist

For every tenant-owned endpoint or repository method: a test that performs the operation with a **valid
id belonging to another tenant** and asserts `404`/no rows, for read, list, search, count, update,
delete and nested access — and asserts it holds on both a cache miss and a cache hit. See
`backend-testing.md` §3.

## 7. Before you…

- **write a repository method** — name the tenant source, then put `tenant_id` in the predicate.
- **add a cache key** — pick the namespace and prove the key cannot collide across tenants.
- **add a table** — decide `tenant_id` (NOT NULL, FK, `ON DELETE CASCADE`) and the composite unique
  constraints before writing the DDL.
- **return a list** — confirm the count query is scoped too, not just the page query.
