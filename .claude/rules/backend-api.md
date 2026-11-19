---
paths:
  - "backend/internal/modules/**/handler/**/*.go"
  - "backend/internal/modules/**/dto/**/*.go"
  - "backend/internal/modules/**/routes.go"
  - "backend/internal/shared/response/**/*.go"
  - "backend/internal/shared/middleware/**/*.go"
---

# HTTP API rules

One contract for every endpoint. The envelope, the error shape and the pagination shape are decided;
handlers follow them rather than inventing per-endpoint variants.

## 1. Routes and methods

- Everything lives under `/api/v1` except `/healthz` and `/readyz`.
- Resource-oriented, plural, kebab-case paths: `/websites`, `/websites/:id/domains`. Ids in the path,
  filters in the query string.
- `GET` list/read (no side effects, no body), `POST` create or a genuine action, `PUT` full replace,
  `PATCH` partial update, `DELETE` remove.
- An action that is not a resource operation is a sub-resource with a verb segment and `POST`:
  `POST /auth/password/change`, `POST /admin/users/:id/activate`. Do not invent `/getUser`,
  `/doThing` RPC names, and do not tunnel updates through `GET`.
- Status codes: `200` read/update, `201` create (**with a `Location` header** pointing at the new
  resource), `202` accepted for work handed to a worker, `204` delete with no body, `400` the request
  could not be parsed (`bad_request`), `401` unauthenticated, `403` authenticated but not permitted,
  `404` missing **or out of tenant scope**, `409` conflict, `413` too large, `422` parsed but failed
  validation (`validation_failed`), `429` rate limited, `500` internal, `503` dependency down.
- `400` vs `422`: a body that is not valid JSON, or whose types do not fit the DTO, is `400`. A
  well-formed body that breaks a field rule is `422` — it reached validation, so it gets field errors.
- Nothing in a URL or response exposes storage internals: no table names, no GORM column names, no
  sequence ids, no SQL in an error.

## 2. The response envelope

Success and failure both go through `internal/shared/response`. **Handlers never call `c.JSON` with a
hand-built body.**

```go
response.OK(c, dto.FromModel(site))                        // {"data": {...}}
response.Created(c, out)                                   // 201 + Location
response.List(c, items, response.NewCursorMeta(cur, 20))   // {"data": [...], "meta": {...}}
response.Error(c, err)                                     // RFC 9457 problem document
```

Error codes are the fixed set in `apperrors`: `validation_failed`, `bad_request`, `unauthorized`,
`forbidden`, `not_found`, `conflict`, `payload_too_large`, `rate_limited`, `internal_error`,
`service_unavailable`. Adding a code means adding it to `apperrors`, mapping its status in `Status()`,
and recording it in `PROJECT_STATE.md` → **Error codes**.

### Errors are RFC 9457 problem documents

`response.Error` renders `response.Problem` with the media type
`application/problem+json; charset=utf-8`. Standard members: `type` (relative URI reference
`/problems/<code>`), `title` (the problem *type*'s summary, from `apperrors.Error.Title()`), `status`,
`detail` (this occurrence's client-safe message), `instance` (the request path). Documented extension
members: `code` (the stable `apperrors` identifier clients switch on), `errors` (field-level failures as
`{field, pointer, detail}`, where `pointer` is an RFC 6901 JSON Pointer), `request_id`.

```json
{
  "type": "/problems/validation_failed",
  "title": "Validation failed",
  "status": 400,
  "detail": "the request is invalid",
  "instance": "/api/v1/auth/register",
  "code": "validation_failed",
  "errors": [{"field": "email", "pointer": "/email", "detail": "enter a valid email address"}],
  "request_id": "0f9c…"
}
```

- `detail` is prose for a human; **clients switch on `code`**, never on `detail` (RFC 9457 §3.1).
- A new error kind means: a `Code` in `apperrors`, a `Status()` arm, a `Title()` arm, and a row in
  `PROJECT_STATE.md` → **Error codes**. Never a bespoke body in a handler.
- Internal causes never reach `detail`; `apperrors.Internal` keeps the generic message and logs the
  chain. Regression-tested in `internal/shared/response/response_test.go`.
- Success responses keep the `{"data","meta"}` envelope — RFC 9457 covers failures only.
- The frontend's `baseApi` normalises this document into `{code, message, fieldErrors, requestId}` for
  its forms. Keep `code` stable — it is what the UI switches on — and never emit the pre-9457 shape
  from a single endpoint to paper over a mismatch.

## 3. DTOs

- Every endpoint has an explicit request DTO and response DTO in the module's `dto/` package.
- Explicit JSON tags on every field, **`camelCase`**, including on nested structs. No reliance on Go
  field names. The one exception is the RFC 9457 problem document, whose `request_id` extension member
  keeps its snake_case spelling because that is what the frontend's `baseApi` already parses.
- **Never bind into a GORM model and never return one.** Models carry columns the client must not see
  or set (`password_hash`, `tenant_id`, `role_id`, `is_active`, internal timestamps).
- Mass assignment: a request DTO contains only fields the caller is allowed to set. Ownership and
  privilege fields (`tenant_id`, `user_id`, `role_id`, `is_active`, `email_verified_at`, `plan`,
  `max_websites`, `storage_limit_bytes`) are set by the service from the session or from policy, never
  from the payload.
- Conversion is explicit (`dto.FromModel`, `in.ToParams()`), in the handler or dto package — not by
  embedding a model in a DTO.
- `map[string]any` is not an API contract. Use a typed struct.
- Zero vs absent on `PATCH`: use pointer fields and treat `nil` as "not supplied".

## 4. Binding and validation

- Use `ShouldBindJSON` / `ShouldBindQuery` / `ShouldBindUri` — **never** `Bind*`, which writes its own
  `400` and bypasses `response.Error`.
- Classify the bind failure: oversized body → `CodeTooLarge` (413), unparseable JSON or a type
  mismatch → `BadRequest` (400), failed validation tags → `Validation` (422) with per-field entries.

```go
if err := c.ShouldBindJSON(&in); err != nil {
    var maxErr *http.MaxBytesError
    var typeErr *json.UnmarshalTypeError
    var syntaxErr *json.SyntaxError
    var validationErrs validator.ValidationErrors
    switch {
    case errors.As(err, &maxErr):
        response.Error(c, apperrors.TooLarge("request body is too large"))
    case errors.As(err, &syntaxErr), errors.As(err, &typeErr), errors.Is(err, io.EOF):
        response.Error(c, apperrors.BadRequest("the request body is not valid JSON"))
    case errors.As(err, &validationErrs):
        response.Error(c, apperrors.Validation("the request is invalid", fieldErrors(validationErrs)...))
    default:
        response.Error(c, apperrors.BadRequest("the request could not be read"))
    }
    return
}
```

- Reject a `POST`/`PUT`/`PATCH` whose `Content-Type` is not `application/json` (or the documented
  multipart type for uploads) with `bad_request`.
- Validate shape and bounds at the transport edge (required, length, format, enum, max page size).
  Validate *rules* (uniqueness, state transitions, entitlements) in the service.
- Every string field has a maximum length. Every slice field has a maximum element count.

## 5. Pagination

**Collections are cursor-paginated by default** — `response.CursorMeta`:
`{"nextCursor","hasMore","pageSize"}`, built with `response.NewCursorMeta`.

- The cursor is **opaque**: base64url of the last row's sort key plus its `id`, plus a fingerprint of
  the filter and order it was issued for. Clients echo it back and never construct one.
- Validate every incoming cursor: well-formed, decodable, and matching the current filter/order
  fingerprint. A cursor that does not match is `bad_request` — never silently reset to the first page.
- Ordering is explicit and **stable**: sort column plus a unique tie-breaker
  (`ORDER BY created_at DESC, id DESC`). The keyset predicate uses the same columns in the same order.
  Never return a page without an `ORDER BY`.
- `page_size` defaults to 20, caps at 100; a larger value is clamped, not honoured.
- Never expose an offset, a row number or a database cursor; never put a raw timestamp+id pair in the
  response as if it were a cursor.
- Put the cursor codec in `internal/shared/pagination` when the first cursor endpoint lands — one
  implementation, not one per module.

Page numbers (`response.PageMeta`, `{"page","pageSize","total","totalPages","requestedAt"}`) are the
**documented exception**, for endpoints whose UI genuinely needs a total count or random page access.
`requestedAt` is the server clock at response time, which list screens show as "updated at".
Using it requires a line in `PROJECT_STATE.md` → **HTTP surface** saying why, and the count query must
carry the same filters and the same tenant predicate as the page query.

## 6. Idempotency

Only for endpoints where a retry can duplicate a real-world side effect (payments, provisioning,
outbound mail triggers). Do not put it on `GET`s or on ordinary creates.

- Header name `Idempotency-Key`, per the IETF httpapi **Internet-Draft** (draft-ietf-httpapi-
  idempotency-key-header). This is a draft, not an RFC — describe it that way in comments and docs.
- Scope the stored record by `(tenant_id, user_id, endpoint, key)`.
- Store a fingerprint (hash) of the request body with the record. Same key + same fingerprint → replay
  the stored response. Same key + different fingerprint → `422`.
- A second request arriving while the first is still in flight → `409`, not a duplicate execution
  (enforce with a unique constraint on the key row, created before the work starts).
- The idempotency record and the business effect commit in the **same transaction**.
- Retention is bounded (24h) and documented where the table is defined.

## 7. Headers and caching

- Every response carries `X-Request-ID`; the same id appears in `request_id` in error bodies and in
  every log line for the request.
- Authenticated responses are `Cache-Control: no-store`. Never `public` on anything tenant-owned.
- CORS comes from config (`CORS_*`); `AllowCredentials` with `*` origins is rejected at startup, and
  handlers do not write CORS headers themselves.
- `Location` on `201`. `Retry-After` on `429` and on `503` where a retry window is known.

## 8. Before you add a route

1. Name the request DTO, the response DTO and the status codes it can return.
2. Name the privilege it requires and the tenant predicate the repository will use.
3. Confirm no GORM model and no sensitive field can reach the response.
4. Decide pagination (page-based unless it meets §5's exception) and the stable order.
5. Decide whether it needs idempotency (§6) — usually it does not.
6. Add it to **HTTP surface** in `PROJECT_STATE.md` in the same change.
