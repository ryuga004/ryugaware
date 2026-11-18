---
paths:
  - "backend/internal/platform/messaging/**/*.go"
  - "backend/internal/modules/notification/**/*.go"
  - "backend/internal/modules/audit/**/*.go"
  - "backend/internal/modules/**/service/**/*.go"
  - "backend/migrations/*.sql"
---

# Events, outbox and DLQ

Transport is Redis Streams (`EVENTS_STREAM`, DLQ `EVENTS_DLQ_STREAM`). A state change and the event
announcing it must not be able to disagree.

## 1. Transactional outbox — no dual writes

A state mutation that triggers an asynchronous side effect writes its event **row** inside the same
Postgres transaction as the state change. Nothing publishes to Redis inside a transaction.

```go
// GOOD
err := database.InTransaction(ctx, db, func(tx *gorm.DB) error {
    if err := users.Create(ctx, tx, u); err != nil {
        return err
    }
    return outbox.Append(ctx, tx, outbox.Event{
        EventID:     uuid.New(),
        EventType:   "auth.user_registered",
        AggregateID: u.ID,
        TenantID:    u.TenantID,
        Payload:     payload,
    })
})

// BAD — the commit can fail after the publish, or the publish after the commit:
// either way the system is lying about what happened
tx.Commit()
bus.Publish(ctx, evt)
```

- The outbox table (`outbox_events`: `event_id` PK, `event_type`, `aggregate_id`, `tenant_id`,
  `payload` JSONB, `status PENDING|PUBLISHED`, `attempts`, `available_at`, `created_at`,
  `published_at`) **does not exist yet** — it arrives with the messaging stage, in its own migration.
- A relay (ticker in `internal/platform/messaging`) claims `PENDING` rows with
  `FOR UPDATE SKIP LOCKED`, `XADD`s them, then marks them `PUBLISHED` in the same statement batch. A
  crash between `XADD` and the mark re-publishes — that is why consumers are idempotent (§3).
- The relay batches (`EVENTS_BATCH_SIZE`), backs off on failure, and never blocks a request path.
- Services never call `XADD` directly; handlers never publish at all.

## 2. Envelope

`event_id` (UUID, the idempotency key), `event_type`, `event_version`, `source`, `occurred_at`,
`payload`, `metadata` (carries `request_id` and `tenant_id`). Event types are `module.past_tense`
constants in the producing module and are listed in **Event catalog** in `PROJECT_STATE.md`.

- Payloads carry ids and the minimum a consumer needs, never a whole model, never a password hash.
- Secrets (verification and reset tokens) travel **only** in `notification.email_requested` and are
  never written to an audit event or a log.
- An event is a fact that already happened. Never publish an intent the transaction has not committed.

## 3. Consumers

- One consumer group per worker (`audit-worker`, `notification-worker`), filtering by event type.
- **Idempotent by construction**: the consumer's own table has a unique constraint on `event_id`, and a
  duplicate insert is a successful no-op, not an error.
- `XACK` only after the work succeeded and committed. Never ack on receipt.
- Bounded retries (`EVENTS_MAX_RETRIES`) with backoff. Recover abandoned messages with
  `XAUTOCLAIM`/`XPENDING` after `EVENTS_CLAIM_MIN_IDLE`.
- On exhausting retries, move the message to the DLQ stream with the failure reason, the attempt count
  and the original envelope, then `XACK` the original so one poison pill cannot stall the group.
- A handler runs under `EVENTS_HANDLER_TIMEOUT`. It must be safe to run twice and safe to run late.
- A consumer never calls another module's repository; it goes through the module's service.

## 4. Pub/Sub

Redis Pub/Sub is only for droppable live signals (`EVENTS_LIVE_CHANNEL`, e.g. `audit.event_created`
for a live feed). Durable work is never carried on Pub/Sub.

## 5. E-mail and other external effects

- Handlers and services never send mail. They write an outbox event; the notification worker sends.
- The worker records the send attempt and emits `notification.email_sent` / `…_failed` so the audit
  trail is driven by facts, not hope.

## 6. Before you add an event

1. Name it `module.past_tense`, add the constant in the producing module and the row in **Event
   catalog**.
2. Decide its consumers and their idempotency key.
3. Write it to the outbox inside the transaction that makes it true.
4. Define what happens when it fails `EVENTS_MAX_RETRIES` times — which DLQ, and who looks.
