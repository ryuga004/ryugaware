---
paths:
  - "backend/**/*.go"
---

# Code quality, SOLID and resource safety

Staff-review standards applied at writing time. Layer boundaries are in `backend-architecture.md`;
this file governs what gets written inside them.

## 1. Economy — justify every line

- Every variable, helper, wrapper, interface and struct field must have an immediate technical reason:
  it simplifies real logic, enforces a safety property, or satisfies a layer boundary. If it does none
  of those, delete it.
- **No speculative code.** No placeholder stubs, no "we'll need this later" hooks, no exported helper
  with one internal caller, no option struct with one field, no config knob nobody sets.
- **No generic repositories.** No `Repository[T]`, no `BaseRepo`, no `FindBy(map[string]any)`. Write
  the explicit query method the use case needs.
- **No factories or builders** for structs that a composite literal constructs correctly.
- **No DI framework, no reflection-driven wiring, no service locator.** Constructors, called in
  `internal/bootstrap`.
- Solve it with the standard library and direct SQL before adding a wrapper. A helper earns its place
  at the third call site, not the first.
- Dead code is deleted, not commented out. Git holds the history.

## 2. No comments

Go source and the environment templates (`.env`, `.env.example`) in this repo carry **no comments of
any kind**. What each knob means, and the rationale for a decision, live in `PROJECT_STATE.md` —
**Environment variables** and the **Decision log**. The code says what it does by naming things well.

- The only permitted lines are compiler and tool directives: `//go:build`, `//go:embed`,
  `//go:generate`, `//nolint`, with no trailing explanation after them.
- No package doc comments, no doc comments on exported identifiers, no inline notes, no section
  banners, no `TODO`, no commented-out code.
- A line that seems to need a comment is a line to rewrite: rename the variable, extract the
  condition, or flatten the control flow.
- Deleting comments from a file you are not otherwise changing is its own change, not a side effect of
  another one.
- `compose.yaml` and other YAML/SQL stay comment-free for the same reason; the migration SQL already
  did (Decision 21).

```go
// GOOD
func (s *Service) Register(ctx context.Context, in RegisterInput) (*RegisterResult, error) {

// BAD
// Register creates the tenant, the licence and the owner user in one transaction
func (s *Service) Register(ctx context.Context, in RegisterInput) (*RegisterResult, error) {
```

## 3. SOLID, as it applies here

| Principle | What it means in this codebase |
|---|---|
| Single responsibility | One package, one business capability. `auth.TokenService` issues and verifies tokens; it does not touch profiles or send mail |
| Open/closed | Extend by composing a new service or subscribing to an event, not by adding a flag to an existing service method |
| Liskov | A repository implementation satisfies its interface completely — no method that panics, returns `ErrNotImplemented`, or silently ignores a parameter |
| Interface segregation | Interfaces are 1–3 methods. A consumer that needs `Send` declares `interface{ Send(ctx, msg) error }`, not the provider's whole surface |
| Dependency inversion | Services depend on interfaces they declare; `pgx`, `redis`, `gin` and the AWS SDK appear only in `internal/platform` and `internal/bootstrap` |

An interface with one implementation and no test double is deleted; pass the concrete type.

## 4. Control flow

- Flat and early-returning. Guard clauses first, happy path last, nesting depth ≤ 3.
- No reflection, no `interface{}`/`any` in business signatures, no code generation for things a
  function can do.
- Concurrency only where it is needed: no goroutine without a clear owner, a bounded lifetime and a
  `ctx` it respects. Every goroutine started in a request path is a leak until proven otherwise.
- No `panic` for expected conditions. `panic` is for programmer errors at startup only.

## 5. Memory and allocation

- Pre-allocate when the size is known: `out := make([]dto.User, 0, len(rows))`.
- `strings.Builder` for loops that build strings; never `s += …` inside a loop.
- Value receivers for small immutable structs, pointer receivers for anything stateful or large. Keep
  one receiver style per type.
- Return slices, not pointers to slices. Return `nil` for an empty result, not `&[]T{}`.
- Do not copy large structs into closures or channels; pass pointers or indexes.
- Stream large payloads (uploads, exports); never read an unbounded body or query result into memory.

## 6. Timeouts, limits and shutdown

- Every database, Redis, S3, SMTP and outbound HTTP call runs under a context with a deadline. A call
  without one is a hung goroutine waiting to happen. Derive from the request context; do not replace it.
- Connection pools are bounded by config (`POSTGRES_MAX_OPEN_CONNS`, `MAX_IDLE_CONNS`,
  `REDIS_POOL_SIZE`). Never create a second pool or a one-off client in a module.
- Request body caps and server timeouts are in `backend-security.md` §3 — do not restate them here.
- Graceful shutdown in `cmd/api`, bounded by `APP_SHUTDOWN_TIMEOUT`: trap `SIGINT`/`SIGTERM`, stop
  accepting connections, drain in-flight requests, stop stream consumers after their current message is
  acked, then close Redis and the DB pool. Shutdown errors are logged, never ignored.
- Degrade rather than fail where the dependency is not essential: a cache miss falls through to
  Postgres; a stream publish failure is a logged error plus a retry, not a 500 on a successful write
  (see `backend-messaging.md`).

## 7. Before you commit

- Could this file be shorter without losing a behaviour? Delete the difference.
- Does every interface have two implementations or a test double? If not, remove it.
- Does any comment explain code rather than record a decision? Remove it, or move it to the Decision log.
- Is every I/O call bounded by a deadline?
