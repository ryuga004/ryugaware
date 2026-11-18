---
paths:
  - "backend/**/*.go"
---

# Backend architecture rules

Layer boundaries, wiring, configuration, errors and context for the Go modular monolith.
`backend/PROJECT_STATE.md` is the source of truth for what exists; **Rule 0 in `backend/AGENTS.md`
(update that file in the same turn) applies to every change you make under `backend/`.**

## 1. Layer contract

Dependency flow is one-way: `handler → service → repository → database`.

| Layer | Owns | May import | Must never |
|---|---|---|---|
| `handler/` | HTTP in/out, binding, status codes | its module's `service`, `dto`, `shared/response` | repositories, GORM, Redis, another module's anything |
| `service/` | business rules, orchestration, transactions | its module's `repository` interface, `dto`, `apperrors`, consumer-side interfaces | `gin`, `net/http` status codes, another module's `repository` |
| `repository/` | all SQL/GORM | its module's `model`, `platform/database` | business rules, `dto`, `gin` |
| `model/` | GORM structs | nothing in the module | JSON tags for API output |
| `dto/` | transport structs | nothing | GORM tags |

Prohibited anywhere under `internal/modules/`: `os.Getenv`, `os.LookupEnv`, importing `internal/config`,
package-level mutable `var`, `init()` that touches infrastructure, `panic` as flow control.

## 2. Composition root

All construction happens in `internal/bootstrap`. Nothing else calls a constructor for a dependency it
did not create itself.

- Build the router with `gin.New()`. **Never `gin.Default()`** — its implicit Logger/Recovery stack is
  not the one this service wants, and it writes unstructured output.
- Register middleware explicitly, in this order, and document any change to it:
  1. panic recovery (logs with `slog`, renders through `response.Error`)
  2. request id (sets `response.RequestIDKey` on the gin context, echoes `X-Request-ID`)
  3. request-scoped logger (`logger.WithContext`)
  4. access log
  5. security headers
  6. CORS
  7. body limit (`http.MaxBytesReader`, before any binding)
  8. request timeout
  9. authentication → tenant resolution → authorization (three separate middlewares, in that order)
- Wire order: config → logger → postgres → redis → storage → smtp → event bus → repositories →
  services → handlers → routes → workers → HTTP server → graceful shutdown.
- A module exposes one `New…` constructor per layer taking its dependencies as parameters. No DI
  framework, no service locator, no globals.

## 3. Configuration

`internal/config` is the only package that reads the environment. It loads once, validates once, and
fails fast with every error at once.

Each module declares the narrow config struct it needs **in its own package**; bootstrap maps
`config.X` onto it. A business module importing `internal/config` is a layering violation.

```go
// GOOD — internal/modules/auth/policy.go (module owns the shape)
type Policy struct {
    BcryptCost     int
    AccessTokenTTL time.Duration
}
// bootstrap: auth.NewService(repo, auth.Policy{BcryptCost: cfg.Auth.BcryptCost, ...})

// BAD — module now depends on every knob in the system
func NewService(repo Repository, cfg config.Auth) *Service
```

Where a value belongs:

| Kind | Home | Examples |
|---|---|---|
| Never tuned per deploy | `const` in the owning module | privilege names, event types, cookie name, token length |
| Differs per environment, or secret | `internal/config` + `PREFIX_` env var | TTLs, bcrypt cost, DSNs, rate limits |
| Differs per tenant | Postgres row (module-owned table) | licence limits, e-mail templates, tenant settings |
| Must change without restart | not supported — do not invent a flag system | — |

Adding an env var means: a field, a loader line, a `Validate()` rule, and a row in
`PROJECT_STATE.md` → **Environment variables**, in the same change.

## 4. Errors

- Services return `*apperrors.Error`. Everything below wraps with `%w` and adds context:
  `fmt.Errorf("auth: find user by email: %w", err)`.
- Classify with `errors.Is` / `errors.As`. **Never compare error strings**, never `err.Error() == "..."`.
- Attach diagnostics with `appErr.WithCause(err)` — the cause is logged, never rendered.
- `response.Error(c, err)` is the only place an error becomes an HTTP status and body. A handler that
  calls `c.JSON(4xx/5xx, …)` directly is a bug.
- Error messages that reach a client must be client-safe: no SQL, no driver text, no identifiers the
  caller is not allowed to know, no secrets (see `backend-security.md`).

```go
// GOOD
if errors.Is(err, gorm.ErrRecordNotFound) {
    return nil, apperrors.NotFound("website not found")
}
return nil, apperrors.Internal(fmt.Errorf("websites: get %s: %w", id, err))

// BAD — leaks the driver error to the client and loses the chain
return nil, fmt.Errorf(err.Error())
```

## 5. Context

- Every function that performs I/O takes `ctx context.Context` as its first parameter.
- Services take `context.Context`, **never `*gin.Context`**. Handlers pass `c.Request.Context()`.
- Never substitute `context.Background()` or `context.TODO()` inside a request path.
- Background work started from a request (event publishing after the response, say) uses
  `context.WithoutCancel(ctx)` plus its own timeout, and says in a comment why it outlives the request.
- Respect cancellation: no `time.Sleep` in request paths; use `select` on `ctx.Done()`.

## 6. Module boundaries

- A module owns its tables and its repository package. No module imports another module's `repository`
  or `model`.
- Cross-module calls go through an interface **declared in the consuming package**, implemented by the
  providing module's service, wired in bootstrap (existing edges: `admin → UserDirectory`,
  `middleware → RoleResolver`, `middleware → SessionChecker`).
- Everything else is an event on the stream. No module imports another module to "just read one row".
- Keep the dependency graph acyclic; invert with an interface or an event instead of adding an import.
- `internal/shared` holds transport and error plumbing only. Business logic there is a boundary leak.

## 7. Before you…

- **add a package** — check the Package map in `PROJECT_STATE.md`; do not create a second home for an
  existing capability.
- **add a dependency** — prefer the standard library; a new `go.mod` entry needs a Decision log entry
  saying what it replaces and why.
- **add a cross-module call** — look for an existing contract first; if none fits, declare the interface
  in the consumer, not the provider.
- **finish** — `go build ./... && go vet ./... && gofmt -l .` clean, unit tests pass, `PROJECT_STATE.md`
  updated per Rule 0.
