# Ryugaware web

Next.js 16 (App Router, TypeScript, Tailwind v4) frontend foundation for the Ryugaware website-builder platform.
State is Redux Toolkit + RTK Query. All API calls are answered by a local dummy backend (JSON in `public/data/`),
shaped exactly like a real REST API so it can be swapped for real HTTP later without touching any UI.

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

## Demo data scenarios

With the dummy API, the sidebar (or the mobile More sheet) has a **Demo data** switch: *Normal*, *Empty*, *Small* and
*Large*. It reshapes the store-section collections (domains, payments, delivery, users, storage, authentication, contact)
so every screen can be reviewed with no data, a few rows, the seed data, or hundreds/thousands of generated rows.
The choice is kept in `sessionStorage`; switching resets the in-memory db and the RTK Query cache
(`baseApi.util.resetApiState()`). Modules opt in with `registerScenario(file, { empty?, small?, large? })`
(`src/lib/api/dummy/scenario.ts`); large data is generated deterministically (`src/lib/api/dummy/fake.ts`).

## Images

Generated artwork lives in `public/images/` (optimised WebP; the original exports in `public/assets_images/` are not used
at runtime): landing hero, feature and step images, CTA background, auth side panels, template homepage screenshots
(`templates/<thumbnailTheme>.webp`, shown by `TemplateShot` with the drawn `ThemeThumbnail` as fallback), empty/error
illustrations (`EmptyState illustration="…"`), payment/delivery marks and avatars. App icon, Apple icon and Open Graph
image use the `app/icon.png`, `app/apple-icon.png` and `app/opengraph-image.png` file conventions.
`next.config.ts` limits the image optimiser to `/images/**`.

## Architecture

```
public/data/*.json            seed data, shaped like API responses (envelope + meta)
src/
  app/                        routes only: (auth)/* and (platform)/* groups, thin page.tsx files
  store/                      makeStore, typed hooks, provider; logout resets every slice
  lib/api/
    baseApi.ts                the single createApi (tags, baseQuery switch dummy <-> HTTP)
    types.ts config.ts        shared contracts, env flags
    dummy/                    baseQuery, router, in-memory db, errors, session (dummy layer only)
  features/<module>/
    types.ts                  API + domain types
    api.ts                    RTK Query endpoints (injectEndpoints) + lifecycle handlers
    dummy.ts                  that module's dummy routes (the only place JSON data is read)
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
* **Dummy backend returns clones** of its in-memory records, like a real server. RTK freezes cached data, so never hand out live objects.

## Switching to a real backend

1. Set `NEXT_PUBLIC_USE_DUMMY_API=false` and `NEXT_PUBLIC_API_URL=...` (see `.env.example`).
2. `baseApi.ts` then uses `fetchBaseQuery` with the same `{ url, method, params, body }` arguments and the same
   `{ status, data: { code, message, fieldErrors? } }` error shape, so endpoints, slices and components are unchanged.
3. Delete `src/lib/api/dummy/`, each `features/*/dummy.ts`, and `public/data/`.

Endpoint contracts are documented at the top of each `features/*/dummy.ts`.

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
