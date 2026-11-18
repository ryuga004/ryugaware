---
name: backend-endpoint
description: Add or change an HTTP endpoint in the Ryugaware Go backend (handler → service → repository, DTOs, tenant scoping, tests, PROJECT_STATE update). Use when asked to add, change or remove an API route, handler or auth/admin/audit/notification endpoint under backend/.
---

# Adding a backend endpoint

Follow in order. Do not skip step 1, and do not report completion before step 8.

## 1. Orient (do not re-read the codebase)

- Read `backend/PROJECT_STATE.md`: **HTTP surface**, **Data model**, **Package map**, **Known gaps**.
- Open only the files you will change.
- Check whether the frontend already calls this endpoint — `frontend/src/features/*/api.ts` holds the
  client contract (paths, request bodies, response shapes, error codes it switches on). If it does,
  match it or record the mismatch; do not silently change a shape the frontend parses.

## 2. Decide the contract before writing code

Write these down (in the PR description or the state file, not as a comment block):

| Decision | Must be explicit |
|---|---|
| Method + path | resource-oriented, under `/api/v1` |
| Request DTO | every field, `snake_case` JSON tags, max lengths |
| Response DTO | no model fields, no secrets |
| Status codes | success + every error code it can return |
| Privilege | which `privileges.name` guards it |
| Tenant predicate | which repository method and its `(ctx, tenantID, …)` signature |
| Pagination | page-based by default; stable order + tie-breaker |
| Events | which events it publishes, if any |

## 3. Build bottom-up

1. **Repository** — intent-named method, `WithContext(ctx)`, tenant predicate in the SQL, driver errors
   classified with `database.Is*` helpers.
2. **Service** — `context.Context` (never `*gin.Context`), typed params, returns `*apperrors.Error`,
   owns the transaction via `database.InTransaction`, publishes events after commit.
3. **DTOs** — request/response structs with explicit tags and explicit conversion functions.
4. **Handler** — `ShouldBind*`, map bind errors (including `*http.MaxBytesError` → `CodeTooLarge`), call
   the service, render via `response.OK/Created/List/Error`. Nothing else.
5. **Route** — register in the module's `routes.go` behind the authentication, tenant and privilege
   middlewares.

## 4. Check the boundaries

- Handler imports no repository. Service imports no `gin`. Repository holds no business rule.
- No module imports another module's `repository` or `model`.
- No `os.Getenv` and no `internal/config` import inside the module.
- No GORM model reaches the response; no client-supplied `tenant_id`/`role_id`/`is_active` reaches a
  model.

## 5. Tests (same change, not later)

- Handler: success shape, each error code, bind failure, oversized body.
- Service: the business rules and the events.
- **Cross-tenant**: the same operation with another tenant's valid id returns `404`/zero rows.
- Serialization: the response contains no `password_hash`, no `jwt_secret`, no unexpected field.

## 6. Verify

```bash
cd backend && go build ./... && go vet ./... && gofmt -l . && go test ./...
```

## 7. Update `backend/PROJECT_STATE.md` (Rule 0)

**HTTP surface** always. Plus **Package map** (new files), **Event catalog** (new events),
**Data model**/**Migrations** (schema), **Environment variables** (new knobs), **Wiring graph** (new
bootstrap edge), **Build log** and **Decision log** (trade-offs).

## 8. Report

State what was built, which checks ran and their real results, and anything left as a known gap.
Never claim a test run that did not happen.
