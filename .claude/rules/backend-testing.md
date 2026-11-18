---
paths:
  - "backend/**/*_test.go"
  - "backend/tests/**/*.go"
---

# Backend testing rules

What must be tested, with which tools, and where the test lives.

## 1. Tooling and layout

- Standard library only: `testing`, `net/http/httptest`, `context`. **No testify**, no mocking
  framework, no new test dependency without a Decision log entry.
- Unit tests sit next to the code (`service_test.go`) and **must not require Docker** or any network.
  They use hand-written fakes for repositories, caches, clocks, token generators and the event bus.
- Integration tests live under `backend/tests/integration`, are behind `//go:build integration`, and
  `t.Skip` when their service env vars are unset.
- Table-driven tests with named cases. `t.Parallel()` where there is no shared state.
- Determinism: inject a `Clock` and a `TokenGenerator`. No `time.Now()`, no `rand`, no `time.Sleep` in
  a test. Use `t.Context()`/`context.WithCancel` to drive cancellation.
- Fakes record calls so a test can assert "published exactly one event", not just "did not error".

## 2. What every layer owes

| Layer | Must have tests for |
|---|---|
| handler | status code, response body shape, error envelope, binding failures, oversized body, wrong content type |
| service | business rules, state transitions, error codes returned, events published, transaction boundary behaviour |
| repository | tenant predicate, constraint-violation mapping, `RowsAffected == 0` handling (integration) |
| middleware | authn/authz decisions, request id propagation, body limit, panic recovery |

## 3. Security tests that are not optional

- **Cross-tenant**: for every tenant-owned operation, call it with a valid id from another tenant and
  assert `404`/zero rows — read, list, search, count, update, delete, nested resource. Assert it holds
  on a cache hit as well as a cache miss.
- **IDOR/BOLA**: the same, driven through the HTTP layer with a real session for tenant A and ids from
  tenant B.
- **Mass assignment**: post a payload containing `tenant_id`, `role_id`, `is_active`,
  `email_verified_at` and assert the stored row is unchanged.
- **Serialization**: assert a response body contains exactly the expected `snake_case` keys and
  **does not** contain `password_hash`, `jwt_secret`, `tenant_id` where it is not part of the contract.
- **Error contract**: each error path returns `application/problem+json`, the documented `code`,
  `status`, `type`, `title`, and — for validation — the `errors` array with a JSON Pointer per field.
  `internal/shared/response/response_test.go` is the worked example, including the assertion that an
  internal cause never reaches `detail`.
- **Redaction**: log to a buffer with the real logger and assert the output contains no password, token
  or e-mail address.
- **Cancellation**: cancel the context mid-call and assert the operation returns promptly and does not
  commit.
- **Idempotency** (where implemented): same key + same body replays; same key + different body → `422`;
  concurrent duplicates → one effect.
- **Rate limiting / enumeration**: unknown vs known e-mail produce the same status and body on
  register, login, forgot-password and resend.

## 4. Conventions

- Test names state the behaviour: `TestLogin_UnverifiedEmail_Returns403`.
- Assert on error **codes** (`apperrors.IsCode(err, apperrors.CodeConflict)`), never on message strings.
- One assertion subject per test case; use subtests for the matrix.
- Integration tests create their own tenant fixtures and clean up by deleting the tenant (cascade),
  never by truncating shared tables.
- No test asserts against a live external service (S3, SMTP, a real SMS provider); use the local
  MinIO/Mailpit targets that the integration env vars point at.

## 5. Before you finish a change

1. `go build ./... && go vet ./... && gofmt -l .` clean.
2. `go test ./...` passes (unit, no Docker).
3. If the change touches a tenant-owned path, a cross-tenant test exists and fails without the fix.
4. Say in the report which tests were actually executed — never claim a run that did not happen.
