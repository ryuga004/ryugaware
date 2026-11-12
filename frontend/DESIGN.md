# Ryugaware design rules

The rules every UI change in this repo follows. Tokens live in `src/app/globals.css` (`@theme`); the components
listed here are the design system. **Build from them before writing new markup**, and if a pattern repeats,
extend the shared component instead of copying classes.

Tone: calm, precise, a little fierce. Flat, warm and restrained. No gradient washes, glassmorphism, 3D or decorative shadows.

---

## 1. Color

Use **only the theme tokens** as Tailwind classes (`bg-surface`, `text-muted`, `border-line`, ...). Never use raw hex
(`text-[#...]`), Tailwind's default palette (`gray-*`, `red-*`, `blue-*`), or `black`/`white` for text and borders.
`text-white` is allowed only on `primary` / `danger` fills. If a color is missing, add a token to `@theme` first.

| Role | Token | Use |
|---|---|---|
| Page background | `page` #faf4ec (cream) | `html` bg, table header rows, subtle hovers (`hover:bg-page/60`) |
| Surface | `surface` #fff | Cards, drawers, modals, inputs, top/bottom bars |
| Subtle | `subtle` #f3ece2 | Hover fills, read-only inputs, neutral badges, skeletons |
| Lines | `line` / `line-strong` | `line` for card and divider borders; `line-strong` for input / secondary-button borders |
| Text | `ink` > `ink-700`/`body` > `muted` > `faint` | `ink` headings and key values, `body` paragraphs, `muted` descriptions/labels, `faint` placeholders only |
| Dark chrome | `ink`, `ink-800`, `on-dark`, `glow` | Sidebar, ink tiles. On dark: text `on-dark`/`page`, active icon `glow` |
| Primary | `primary` (Ember-deep) + `-hover`/`-active` | Primary buttons, links, active states, focus ring, switches |
| Tint | `tint` | Selected/active backgrounds paired with `text-primary` |
| Ember / Glow | `ember`, `glow` | **Accent only**: small dots, focus ring glow (`ring-ember/20`), icons on dark. Never a surface, never a text color on light, never text on ember |
| Status | `success`, `warning`, `danger` each with `-bg` + `-border` (+ `warning-text`, `danger-hover`) | Badges, alerts, field messages. Text on a status `-bg` uses the darker text token (`warning-text`, `danger-hover`) |

**Ember is a seasoning, not a surface.** Primary actions are `bg-primary`, not `bg-ember`.

Never communicate state with color alone: pair it with a label, icon or dot (`StatusBadge`, `Alert`, `FormField` messages).

## 2. Typography

| Font | Class | Use |
|---|---|---|
| Inter | `font-sans` (default) | All UI text. Body is 14px / 1.5 (`text-sm`) |
| Space Grotesk 600 | `font-heading font-semibold` | Page titles, section, card, drawer and dialog titles, stat numbers |
| JetBrains Mono | `font-mono` | Domains, DNS records, IDs, keys, tokens, code (`<Input mono>`) |
| Orbitron 700 | `font-logo` | **Wordmark only** (`Logo`). Never anywhere else |

Scale (do not invent sizes):

- Page title `text-2xl` (via `PageHeader`), drawer / modal / empty-state title `text-xl`, section title `text-base`, sheet title `text-lg`.
- Body and controls `text-sm`; hints, badges, captions, table headers `text-xs`.
- Overlines / table headers / stat labels: `text-xs font-medium tracking-wide text-muted uppercase`. Nav group labels: `text-[11px] tracking-[0.08em] uppercase`.
- Weights: `font-medium` for labels, buttons, nav; `font-semibold` only with `font-heading`. No `font-bold` in UI.
- Numbers that line up or change (money, counts, stats): `tabular-nums`.

## 3. Shape, elevation, motion

- Radius: `rounded-md` for controls (buttons, inputs, alerts, nav items); `rounded-card` (10px) for cards, panels, tables, empty states; `rounded-sheet` (16px) for drawers, modals, bottom sheets; `rounded-full` for badges, avatars, switches, dots. Avoid `rounded-lg/xl/2xl`.
- Borders do the separation work: cards are `border border-line bg-surface`, **no shadow**.
- Shadows only on floating layers: `shadow-pop` (menus, popovers, save bar, toasts), `shadow-drawer` (drawers, modals, sheets).
- Overlays: `bg-ink/40`.
- Motion: only the theme animations (`animate-drawer-in`, `animate-fade-in`, `animate-pop-in`, `animate-sheet-in`, `animate-toast-in`) and `transition-colors` / `transition-opacity` / `transition-shadow`. 150–200ms, ease-out. Reduced motion is handled globally; don't add bouncy or long animations.

## 4. Spacing and layout

- Tailwind 4px scale only. Common rhythm: `gap-3` between controls, `gap-4 sm:gap-6` between cards, `mb-6` under the page header, `mb-5` under toolbars/alerts, `p-5`–`p-6` inside cards, `px-6 py-5` drawer/modal headers, `px-6 py-4` footers.
- Content is capped by `AppShell` at `max-w-[1200px]`; pages don't add their own outer padding or max width.
- Fixed widths: drawer 480px, modal 560 / 860px, confirm dialog 440px.

### Responsive (mobile first, every screen must work at 360px)

| Breakpoint | Shell |
|---|---|
| `< md` | 56px top bar + 64px bottom tab bar (3 primary items + **More** sheet). Content has `pb-24` to clear the tab bar |
| `md` | 64px dark icon rail |
| `lg+` | 240px dark sidebar with group labels |

- Toolbars stack: `flex flex-col gap-3 lg:flex-row lg:items-center`.
- Grids: `md:grid-cols-2 xl:grid-cols-3` for cards; `StatGrid` for stats.
- Actions go full width on phones (`max-sm:[&>*]:w-full`, `max-sm:[&>button]:flex-1`); dialog buttons `flex-col-reverse` on mobile.
- Tables scroll horizontally (`min-w-[640px]`); where a table is the main content, also provide a mobile card list.
- Drawers become full screen below `sm`.
- Fixed bottom UI (save bar, toasts) sits above the mobile tab bar (`bottom-16 md:bottom-0`).

## 5. Components (use these; don't rebuild them)

**Primitives** (`src/components/ui/`)

- `Button` variants: `primary` (one per view area, the main action), `secondary` (bordered alternative), `ghost` (tertiary / Reset), `danger` (confirming a destructive action), `dangerGhost` (destructive entry point in menus/rows). Sizes `sm` 32px / `md` 36px (default) / `lg` 44px (auth and marketing). Use `loading`, `leftIcon`, `rightIcon` instead of hand-rolled spinners.
- `IconButton` for icon-only actions: `label` is required (accessible name + tooltip).
- `ButtonLink` for navigation that looks like a button (never a `<button>` that routes).
- `Input` (`leftIcon`, `rightSlot`, `suffix`, `mono`, `invalid`), `Select`, `Checkbox`, `Switch`, `SegmentedControl`, `Badge`, `Avatar`, `Skeleton`, `Spinner`, `UsageBar`.
- Controls are 36px (`h-9`) by default, 44px (`h-11`) for large/auth forms; focus = `border-primary` + `ring-[3px] ring-ember/20`.

**Platform patterns** (`src/components/platform/`)

| Need | Use |
|---|---|
| Page title + description + main action | `PageHeader` (every platform page starts with it) |
| Create / edit form | `Drawer` (right side, `dirty` + `busy` guard unsaved changes) |
| Read-only preview / detail | `Modal` |
| Delete, discard, irreversible | `ConfirmDialog` (`tone="danger"`, `requireText` for high-impact deletes) |
| Row / card overflow actions | `ActionMenu` |
| Labeled form control | `FormField` render prop (wires `id`, `invalid`, `aria-describedby`) |
| Single-form settings page | `SettingsSection` blocks + `SaveBar` |
| Lists | `SearchInput` + `FilterSelect` toolbar, `DataTable`, `Pagination` |
| Status | `StatusBadge` with a per-feature `StatusMap` in `features/<module>/constants.ts` |
| Inline message | `Alert` (`info` / `success` / `warning` / `error`) |
| Transient feedback | `dispatch(pushToast({ tone, title, description? }))` |
| Nothing yet / no results | `EmptyState` with `illustration` |
| Load failure | `ErrorState` with `onRetry` |
| Numbers | `StatTile` / `StatGrid`, charts from `Charts.tsx` (always with the table view) |

Merge classes with `cn()` from `@/lib/cn`; components accept `className` for layout tweaks, not to restyle their colors.

## 6. Every data view has all states

1. **Loading** – `Skeleton` shapes matching the final layout (tables / tiles do this via `loading`). No full-page spinners.
2. **Refetching** – keep content, dim it: `transition-opacity opacity-60` + `aria-busy`.
3. **Empty** – `EmptyState` with an illustration, a one-line reason and the primary action.
4. **No results** (filters active) – `EmptyState illustration="no-results"` + *Clear filters*.
5. **Error** – `ErrorState` with *Try again*.
6. **Disabled with reason** – disabled controls get a `title` / helper text explaining why (e.g. license limit).

Mutations: button `loading` while pending, success/error toast after, destructive actions behind `ConfirmDialog`.

## 7. Accessibility (not optional)

- Visible focus is global (`:focus-visible` primary outline). Never remove outlines.
- Icon-only controls need `IconButton label` / `aria-label`; decorative icons get `aria-hidden`.
- Inputs always have a label (via `FormField`); errors are linked with `aria-describedby` and `aria-invalid`.
- Dialogs / drawers / sheets use Radix Dialog with a `Title` and `Description` (`sr-only` if not shown).
- Tables have a `caption` (can be `sr-only`) and `scope="col"` headers. Charts offer a table view.
- Navigation uses `aria-current="page"`; toggles use `role="switch"` / `aria-checked`.
- Text contrast: body text is `ink`/`body`/`muted` on light surfaces; `faint` is for placeholders and disabled hints only.
- Minimum touch target 32px (36px+ preferred on mobile).

## 8. Icons and imagery

- Icons: `lucide-react` only. `size-4` in buttons and inputs, `size-[18px]` in nav and alerts, `size-5` for close buttons and tab bar. Color inherits (`text-muted`, active `text-primary` / `text-glow` on dark).
- Images: `next/image` from `public/images/**` (WebP). `public/assets_images/` holds source exports and is **not** used at runtime.
- New artwork follows the global style block in `docs/STITCH_ASSET_PROMPTS.md` (palette, flat studio look, no UI chrome, real content).

## 9. Copy and formatting

- Sentence case everywhere (titles, buttons, labels): "New website", not "New Website".
- Buttons are verb-first and specific ("Add domain", "Save changes", "Delete website"); pending labels end in an ellipsis character ("Saving…").
- Use typographic apostrophes and ellipses (`’`, `…`). Error copy says what happened and what to do ("We couldn’t load your websites" + "Try again").
- Realistic Indian-market content: ₹ / INR, `en-IN` dates. Use `lib/format.ts` (`formatMoney`, `formatDate`, `formatNumber`, `pluralize`, ...) for every displayed value; missing values render as `—`.
- Don't call `Date.now()` / `Math.random()` during render (prerender must match the client).

## 10. Before you finish a UI change

- [ ] Only theme tokens and existing components; no raw hex or default Tailwind colors.
- [ ] Checked at 360px, `md` and `lg` widths.
- [ ] Loading, empty, no-results and error states exist.
- [ ] Keyboard and screen-reader basics from section 7 hold.
- [ ] `npm run lint && npx tsc --noEmit` pass.
