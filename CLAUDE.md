# Ryugaware

Monorepo with two deployables:

- `frontend/` — Next.js 16, Tailwind v4, Redux Toolkit.
- `backend/` — Go modular monolith (Gin, GORM, Postgres, Redis Streams, S3/MinIO, SMTP).

Each has its own agent instructions, loaded below; follow them in every session.

**Before working in `backend/`, read `backend/PROJECT_STATE.md`** — it is the written
source of truth for what exists and how it is wired, so you do not have to re-read the
codebase. Keeping it current after every change is Rule 0 in `backend/AGENTS.md`.

@frontend/AGENTS.md
@backend/AGENTS.md
