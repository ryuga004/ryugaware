# Ryugaware web

Next.js 16 (App Router, TypeScript, Tailwind v4) frontend foundation for the Ryugaware website-builder platform.
State is Redux Toolkit + RTK Query. Every API call goes to the Go backend in `../backend` over HTTP with
cookie sessions (`credentials: "include"`); point `NEXT_PUBLIC_API_URL` at it (default
`http://localhost:8080/api/v1`).

Only `/auth/*` exists on the backend today, so the auth screens work end to end and the dashboard
sections will error until their modules are built.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npm run lint && npx tsc --noEmit
```

**Demo login:** `priya@bloomstudio.com` / `Password1!`  
Unverified account: `unverified@example.com`. Verification / reset demo links are shown on the relevant screens
(`valid-token` works, `expired-token` is expired).

## Modules

| Module | Pages / UI | Operations |
|---|---|---|
| `auth` | login, register, forgot password, verify email, reset password, session guard, logout | session, login, logout, register, resend, verify, forgot, validate token, reset |
| `websites` | `/websites` grid + table, New / Edit drawer, delete dialog | list (search, status/type filter, pagination), get, create, update (rename / pause), delete, subdomain check |
| `templates` | `/templates` cards, category tabs, preview modal | list (search, category, pagination), get; "Use template" opens the shared New website drawer |
| `settings` | `/settings` organization, defaults, security, sessions, change-password drawer, save bar | get/update organization, options, list / revoke sessions, change password |
| `account` | `/profile` details + license, edit-profile drawer | get/update me, license (usage kept in sync) |
| `domains` | `/domains` table / mobile cards, Add domain drawer, DNS records drawer, remove dialog | list (search, status, website, pagination), get (with DNS records), add, verify (pending → verifying → active), make primary, remove |
<!-- MODULES:NEW -->

The sidebar groups these as **Workspace** (Websites, Templates), **Store** (Payments, Delivery, Domains, Users) and
**Configuration** (Storage, Authentication, Contact details, Settings). On phones the tab bar shows Websites, Templates,
Payments and a **More** sheet with every section.

## Images

Generated artwork lives in `public/images/` (optimised WebP; the original exports in `public/assets_images/` are not used
at runtime): landing hero, feature and step images, CTA background, auth side panels, template homepage screenshots
(`templates/<thumbnailTheme>.webp`, shown by `TemplateShot` with the drawn `ThemeThumbnail` as fallback), empty/error
illustrations (`EmptyState illustration="…"`), payment/delivery marks and avatars. App icon, Apple icon and Open Graph
image use the `app/icon.png`, `app/apple-icon.png` and `app/opengraph-image.png` file conventions.
`next.config.ts` limits the image optimiser to `/images/**`.

## Architecture

```
src/
  app/                        routes only: (auth)/* and (platform)/* groups, thin page.tsx files
  store/                      makeStore, typed hooks, provider; logout resets every slice
  lib/api/
    baseApi.ts                the single createApi (tags, HTTP base query, RFC 9457 parsing, silent refresh)
    types.ts config.ts        shared contracts, env config
  features/<module>/
    types.ts                  API + domain types
    api.ts                    RTK Query endpoints (injectEndpoints) + lifecycle handlers
    slice.ts                  client state (filters, drawers, drafts) + extraReducers on endpoint matchers
    schemas.ts                zod form validation
    components/               module UI built from shared components
  components/ui/              primitives: Button, Input, Select, Switch, Checkbox, Badge, Skeleton, ...
  components/platform/        AppShell, Drawer, ConfirmDialog, Modal, DataTable, Pagination, SearchInput,
                              FilterSelect, FormField, ActionMenu, Alert, EmptyState, ErrorState,
                              ToastViewport, SettingsSection, PasswordInput/Rules, ThemeThumbnail, ...
```

### State rules

* **RTK Query is the source of truth for server data.** Components only use generated hooks; no JSON or fetch in components.
* **Slices hold client state only**: filters/pagination, which drawer is open, form drafts, toasts, and small derived snapshots
  (list stats, license usage, session count). Slices react to API calls through `extraReducers` + endpoint `matchFulfilled`,
  so every API response/mutation updates its slice immediately.
* **Mutations keep the cache consistent**: tag invalidation for counts/pagination, `updateQueryData` for instant in-place
  patches (update, optimistic delete, sign-out), `upsertQueryData` for login/logout/profile.
* **Errors arrive as RFC 9457 problem documents** and are normalised in `baseApi.ts` into
  `{ status, data: { code, message, fieldErrors?, requestId? } }`. Components switch on `code`, never on prose.
* **A 401 retries once** behind a silent `POST /auth/tokens/refresh`, so a 15-minute access token is invisible to the UI.

## Backend

Start the dependencies and the API from `../backend`:

```bash
cd ../backend
docker compose up -d        # postgres, redis, minio, mailpit
go run ./cmd/migrate up
go run ./cmd/api            # http://localhost:8080
```

Registration is OTP-first: `/auth/email-verification/otp` → `/auth/email-verification/verify`
(6-digit code) → `/auth/register`. The code arrives by e-mail; locally that means
[Mailpit](http://localhost:8025), which catches every message the notification worker sends.

The endpoint surface is listed under **HTTP surface** in `../backend/PROJECT_STATE.md`.

## Redux DevTools

The store is created with `devTools` enabled outside production. Open Redux DevTools in `npm run dev` to inspect the
slices (`auth`, `ui`, `websites`, `templates`, `settings`, `account`, `domains`, `payments`, `delivery`,
`customers`, `storage`, `customerAuth`, `contact`) and the RTK Query cache under `api`.

## Next.js 16 notes

* `cacheComponents` is on: client-only pages are prerendered as static shells; data loads in the browser through RTK Query.
  Avoid `Date.now()` / `Math.random()` during render (formatters in `lib/format.ts` are fixed-locale and UTC).
* Previously visited routes stay mounted but hidden, so filters and drafts survive navigation.
* Components using `useSearchParams` are wrapped in `<Suspense>`.
* The signed-in area waits for a client-side session check, so `(platform)` pages export `instant = false`
  (navigation between them is still instant because the layout stays mounted).
* `next/image`: `preload` replaces the old `priority`; `images.qualities` and `images.localPatterns` are set in `next.config.ts`.
