---
name: backend-module
description: Create a new module in the Ryugaware Go modular monolith (package layout, boundaries, cross-module contracts, bootstrap wiring, events). Use when asked to add a new backend module or to wire an existing one into bootstrap.
---

# Adding a backend module

Modules today: `auth`, `admin`, `audit`, `notification`. Add a fifth only when it owns tables and a
bounded responsibility no existing module should hold — otherwise extend an existing module.

## 1. Orient

Read **Architecture**, **Package map**, **Wiring graph** and **Cross-module edges** in
`backend/PROJECT_STATE.md`. Confirm the capability is not already somewhere.

## 2. Layout

```
internal/modules/<name>/
  handler/      HTTP only
  service/      business rules, context.Context
  repository/   all SQL/GORM for this module's tables
  model/        GORM structs (never leave the module)
  dto/          request/response structs
  routes.go     route registration
  <name>.go     module-owned config struct (Policy) and constructors
```

## 3. Boundaries to hold

- One-way flow `handler → service → repository`. Nothing skips a layer.
- The module owns its tables. No other module imports its `repository` or `model`.
- Need something from another module? Declare a **small interface in this module** describing what you
  need, let the other module's service satisfy it, and wire it in bootstrap. If the call does not need
  a synchronous answer, publish an event instead.
- Module-owned config struct here; bootstrap maps `config.X` onto it. The module never imports
  `internal/config` and never reads the environment.
- No package-level mutable state, no `init()` side effects, no DI framework.

## 4. Wiring

In `internal/bootstrap`: construct repositories → services → handlers → register routes → register any
worker. Keep the documented order (config → logger → postgres → redis → storage → smtp → event bus →
repos → services → handlers → routes → workers → server). The composition root is the only place
concrete types meet.

## 5. Events

If the module produces or consumes events: add the type to the **Event catalog**, use the standard
envelope, keep secrets out of audit payloads, make consumers idempotent (unique `event_id`), ack only
after success, and give failures a bounded retry and the DLQ.

## 6. Verify and record

```bash
cd backend && go build ./... && go vet ./... && gofmt -l . && go test ./...
```

Update `backend/PROJECT_STATE.md` per Rule 0: **Package map**, **Wiring graph**, **HTTP surface**,
**Event catalog**, **Status**, **Build log**, and a **Decision log** entry explaining why the module
exists and where its boundary runs.
