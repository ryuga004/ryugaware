<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Design rules (read before any UI work)

All UI in this repo follows **`DESIGN.md`** (in this directory): theme tokens only (no raw hex or default Tailwind
colors), the shared components in `src/components/ui` and `src/components/platform`, the type scale, responsive
shell rules, required loading / empty / no-results / error states, accessibility and copy rules.
Follow it for every page, component or style change, and run its section 10 checklist before finishing.
If a change needs something DESIGN.md doesn't cover, extend the shared component / `@theme` token and update DESIGN.md
in the same change.

@DESIGN.md
