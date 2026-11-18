# Ask before assuming

This rule has no `paths`, so it applies to every session in this repo.

## 1. The rule

When a choice is **not already settled** in `backend/PROJECT_STATE.md` or in these rule files, and the
alternatives would produce materially different work, **ask before building**. Do not pick a side and
report it afterwards.

## 2. Always ask

- **Names that become contracts**: tables, columns, env vars, routes, JSON field names, error codes.
- **Anything that reverses a recorded Decision** in `PROJECT_STATE.md` — even when the new instruction
  seems to imply it. Quote the decision, state what reversing costs, then ask.
- **Contracts another deployable consumes**: the error body, field casing, pagination shape, cookie vs
  header sessions, anything `frontend/src/lib/api` parses.
- **Identity and schema shape**: what a tenant is, how roles are scoped, what is unique, what cascades.
- **Security trade-offs**: where a key lives, what signs what, what is cached and for how long.
- **Scope**: if finishing properly means building something the request did not name, ask rather than
  silently expanding or silently dropping it.

## 3. Don't ask about

- Reversible details with an obvious default (log wording, variable names inside a function, test
  layout, file split).
- Anything already decided — follow the decision; if it looks wrong, say so in one line and keep going.
- Pure mechanics: how a loop is written, which stdlib helper to use.

## 4. How to ask

- **One batch, not a drip.** Collect the open questions and ask them together, before writing code.
- 2–4 concrete options per question. Each option says what it *costs*, not just what it is. Put the
  recommendation first and label it.
- Say what is already ruled out and why, so the answer is informed.
- Then build the whole answer, without re-asking.

## 5. When you cannot ask

If the user is not there to answer: pick the option that is cheapest to reverse, **state the
assumption explicitly in the report**, and record it in the **Decision log** the same turn. An
assumption that is not written down is a bug waiting to surface.

## 6. Why this exists

Unasked assumptions in this project have already reached the schema and the API contract and had to be
undone: table naming (`organizations` → `tenants` → nearly `customers`), the error envelope
(`{"error":…}` → RFC 9457), field casing, `400` vs `422`, global vs per-tenant token signing, and
renaming `AUTH_JWT_SECRET`. Each was a one-sentence question that turned into a multi-file rewrite.
Asking costs one message. Not asking costs a migration, a frontend change, or both.
