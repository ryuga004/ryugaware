# Ryugaware platform architecture

> **Status: proposed. Nothing here is implemented yet.**
> Backend is at stage 4 of 18 (config, logger, apperrors, response — see `backend/PROJECT_STATE.md`).
> The admin frontend runs on dummy data. So this is a design to agree on, not a description of the code.
>
> Scope: how one customer creates many independent websites from our templates, customises them,
> connects their own domains, and how we serve all of them from shared infrastructure.
>
> **A frontend-only demo of sections 2–6 now exists** in `frontend/src/features/storefront`: the
> Aurelia template (manifest + section schemas + preset), the multi-tenant renderer at
> `/sites/<subdomain>`, template gallery and preview, the create-website wizard, and the visual
> editor. The editor also scopes the organisation-wide sections to one website — which payment and
> delivery methods it offers, how shoppers sign in, where its media lives — by writing the
> `appliesTo` / `websiteIds` / override records those sections already own, rather than copying the
> selection. It runs on the dummy API with no backend. The model it implements is the one described
> here; what it does not yet have is the backend, published snapshots (`site_versions`), real
> domains and TLS, and a catalogue module.

---

## 0. The three planes

Everything below is easier to reason about once these are separated. They are three
**responsibilities**, deployed as three things, serving three completely different kinds of traffic.

| Plane | Deployable | Traffic | Auth |
|---|---|---|---|
| **Control** — accounts, websites, content editing, media, domains, publishing | `frontend/` (Next admin) + Go API | Low volume, authenticated, write-heavy | Platform session (the customer) |
| **Content store** — the single source of truth | Postgres + Redis + S3 | — | — |
| **Delivery** — serving published websites to the public | `storefront/` (Next, to be created) | High volume, anonymous, read-only, cacheable | None (or shopper session) |

**One storefront app serves every customer website.** Not one deployment per website, not one per
customer. The website is *data*; the app is shared. This is the single most important decision here.

---

## 1. The three-way separation

Keep these three distinct for the life of the product. Collapsing any two causes the failure modes
you listed in section 3 of your brief (one site's edit affecting another, a template change
overwriting live content).

```
TEMPLATE VERSION            WEBSITE (draft)              SITE VERSION (published)
ours, immutable, code       theirs, mutable, data        immutable snapshot, data
──────────────────────      ─────────────────────        ───────────────────────
section components          pages + sections             frozen copy of the draft
section field schemas       theme settings               what visitors actually get
default preset content      navigation, SEO, media       rollback target
                            pinned to a template version
```

- A **template version** is never edited by a customer, and never changes after release.
- A **website** is one customer's editable draft. It is created *from* a preset, then lives its own life.
- A **site version** is what the public sees. Editing never touches it; publishing creates a new one.

---

## 2. How templates are defined and stored  *(Q1)*

A template is **code we ship plus a manifest that describes what is editable**. It is not a database
row that somehow becomes a website, and it is not an HTML file we copy.

```
storefront/templates/classic/2.3.0/
  template.json          manifest: pages, section types, field schemas, theme schema
  preset.json            default content for a new website (pages, sections, theme values)
  sections/Hero.tsx      the React implementation of each section type
  sections/Services.tsx
  layout/Header.tsx  layout/Footer.tsx
```

The database stores **metadata and schema, never code**:

| Table | Key columns |
|---|---|
| `templates` | `id`, `slug` (`classic`), `name`, `category`, `status` |
| `template_versions` | `id`, `template_id`, `version` (`2.3.0`), `manifest_json`, `preset_json`, `status`, `released_at` |

Why the manifest is mirrored into Postgres: the **admin** needs the field schemas to render editing
forms, and the admin must not import storefront code to get them. Releasing a template version is a
deploy step that writes `manifest_json` + `preset_json` into the DB.

Your existing `Template` type (`frontend/src/features/templates/types.ts`) is already the catalogue
row — it gains `versions` and loses nothing.

---

## 3. Template → website instance  *(Q2)*

"Create website" is a **copy of the preset into the customer's own rows**, inside one transaction:

```
POST /api/v1/websites { name: "Bloom Studio", subdomain: "bloom", templateVersionId: "classic@2.3.0" }

  1. authorise: customer owns this, quota not exceeded
  2. insert websites                    (template_version_id pinned, status = draft)
  3. insert website_settings            from preset.settings
  4. insert website_themes              from preset.theme
  5. insert pages + page_sections       from preset.pages      ← his own rows from now on
  6. insert navigations                 from preset.navigation
  7. reserve <subdomain>.ryugaware.site in domains
```

Two consequences, both of which you asked for:

- **Editing Website A cannot affect Website B.** They share zero rows — only the template *code*,
  which is read-only for everyone.
- **Changing a template never overwrites a live website.** `preset_json` is read exactly once, at
  creation. After that it is irrelevant to that website forever.

**Full copy, not copy-on-write.** Do not store "only his differences from the preset" and fall back to
template defaults at render time. It saves storage you do not need to save, and it makes rendering,
preview, publishing, versioning and "which value am I actually looking at?" all harder. "Reset
section to default" is then a feature (re-copy one section from the preset), not an architecture.

---

## 4. Data model  *(Q3)*

Structure in columns, variable content in JSONB. Not everything as rows (EAV is unusable), not
everything as one blob (unqueryable, un-diffable, lock contention).

```
customers ──< websites ──< pages ──< page_sections
                 │   │
                 │   ├──< navigations
                 │   ├──< media_assets
                 │   ├──< domains
                 │   └──< site_versions        (published snapshots)
                 │
                 ├─ website_settings  (1:1)
                 ├─ website_themes    (1:1)
                 └─ template_versions (FK, pinned)
```

| Table | Key columns | Notes |
|---|---|---|
| `websites` | `id`, `customer_id`, `name`, `subdomain`, `template_version_id`, `status`, `published_version_id`, `created_at` | `status`: `draft` / `live` / `paused` — already in your admin types |
| `website_settings` | `website_id`, `description`, `logo_media_id`, `favicon_media_id`, `locale`, `timezone`, `currency` | 1:1 |
| `website_themes` | `website_id`, `settings_json` | validated against the template's theme schema |
| `pages` | `id`, `website_id`, `path`, `title`, `kind`, `seo_json`, `position`, `status`, `deleted_at` | unique `(website_id, path)` |
| `page_sections` | `id`, `page_id`, `section_type`, `position`, `enabled`, `settings_json` | ordered; `settings_json` validated against the section schema |
| `navigations` | `id`, `website_id`, `location` (`header`/`footer`), `items_json` | items reference `page_id`, not a URL string |
| `media_assets` | `id`, `website_id`, `storage_key`, `mime`, `bytes`, `width`, `height`, `alt` | one bucket, key prefix `websites/<id>/` |
| `domains` | `id`, `website_id`, `hostname` (globally unique), `primary`, `status`, `ssl_status`, `verification_token` | already modelled in your admin |
| `site_versions` | `id`, `website_id`, `number`, `snapshot_json`, `note`, `created_by`, `created_at` | immutable |

**Two page kinds.** `kind = static` are content pages the customer owns and edits (home, about,
contact, policies). `kind = system` are route templates owned by the template code
(`/products/:slug`, `/collections/:slug`, cart, checkout, account) — never copied per page, driven by
catalogue data. Without this split, an ecommerce customer would have to "create a page" per product.

**Links are references, not strings.** A button pointing at the about page stores
`{ type: "page", page_id: 42 }`. Renaming the slug then cannot break internal links. External links
store a URL.

---

## 5. Section schemas: the contract between editor and renderer  *(Q4, Q6)*

One schema, declared by the template, consumed by both sides. This is what lets a customer edit
content with no code, and lets you add a template without touching the admin.

```jsonc
// template.json (extract)
{
  "sections": {
    "hero": {
      "label": "Hero",
      "fields": [
        { "key": "heading",   "type": "text",   "label": "Heading", "max": 80, "required": true },
        { "key": "sub",       "type": "textarea", "label": "Subheading", "max": 200 },
        { "key": "image",     "type": "image",  "label": "Background image" },
        { "key": "ctaLabel",  "type": "text",   "label": "Button label", "default": "Shop now" },
        { "key": "ctaTarget", "type": "link",   "label": "Button goes to" },
        { "key": "align",     "type": "select", "label": "Alignment",
          "options": [{"value":"left","label":"Left"},{"value":"center","label":"Center"}] }
      ]
    },
    "services":     { "label": "Services",     "fields": [ /* repeater of items */ ] },
    "testimonials": { "label": "Testimonials", "fields": [ /* ... */ ] }
  },
  "pages": {
    "home":    { "label": "Home",    "allows": ["hero","services","testimonials","contact"] },
    "about":   { "label": "About",   "allows": ["rich_text","team","contact"] }
  },
  "theme": { "fields": [ /* colors, fonts, radius, header style */ ] }
}
```

Field types to support (deliberately small): `text`, `textarea`, `richtext`, `number`, `boolean`,
`select`, `image`, `file`, `link`, `color`, `list` (repeater of the above), and later `ref`
(product / collection) for ecommerce sections.

- **Admin** renders a form from this: each field type maps to one control that already exists in
  `frontend/src/components/ui` (`Input`, `Select`, `Switch`, `FormField`, a media picker). Adding a
  template adds **zero** admin code.
- **Renderer** receives the validated `settings_json` as props.
- **API** validates writes against the schema — the schema is the validation rule, server side.

The customer's editing experience is then exactly your section 5: a page is a list of sections they
can reorder, enable/disable, and fill in; nothing free-form, nothing that can break the design.

---

## 6. Rendering  *(Q5)*

A section registry per template version, and a catch-all route:

```
storefront/app/[[...path]]/page.tsx

  host         = headers().host
  website      = resolveHost(host)                    → Redis, fallback Postgres
  snapshot     = getPublishedSnapshot(website)        → Redis/CDN, immutable by version number
  page         = snapshot.pages[path] ?? 404
  theme        → CSS variables on :root
  sections     → page.sections.map(s => Registry[tplVersion][s.type] ?? skip)
  metadata     → generateMetadata() from page.seo
```

- **Unknown section type → skip it, don't crash.** This is what makes rolling template versions safe.
- **Theme as CSS variables** matches how the admin already themes itself (`@theme` tokens in
  `globals.css`) — the same discipline, different values per website.
- Snapshots are immutable and keyed by version number, so they cache forever; publishing writes a new
  key and purges by tag.
- This Next version has breaking changes (`export const dynamic` no longer exists, for example), so
  confirm the exact caching and revalidation API against `node_modules/next/dist/docs/` when building.

---

## 7. Preview, publish, rollback  *(Q7)*

| State | What it is | Where it lives |
|---|---|---|
| **Draft** | What the customer is editing right now | the live rows: `pages`, `page_sections`, `website_themes` |
| **Preview** | Draft rendered exactly as the public would see it | same renderer, draft data, signed token, `noindex`, no cache |
| **Published** | What visitors get | `site_versions.snapshot_json` pointed at by `websites.published_version_id` |

```
Publish:
  serialize draft (pages + sections + theme + nav + settings, media URLs RESOLVED)
  → insert site_versions (number = last + 1, snapshot_json)
  → update websites.published_version_id
  → emit site.published  → purge edge cache for all hostnames of this website
  (one transaction + one event; instant, no build step)

Unpublish: published_version_id = NULL   → delivery serves "coming soon" / 404
Rollback:  published_version_id = <old>  → one row update, instant
```

Resolve media URLs and internal links **into** the snapshot, so delivery does zero joins: one key
lookup, one render. That is what keeps the public plane fast and cheap.

---

## 8. Domains, TLS and the request flow  *(Q8)*

```
customer adds www.mybusiness.com
  → we show: CNAME  www → sites.ryugaware.app          (apex: A/ALIAS, or redirect apex → www)
  → verification: resolve the CNAME, or a TXT challenge   (status: pending_dns → verifying → active)
  → certificate: on-demand TLS at the edge, issued the first time the hostname is requested,
    gated by an "ask" endpoint that confirms the hostname is a verified domain of a live website.
    Certs stored centrally (Postgres/Redis) so any edge node can serve them.
```

Your admin already models this: `Domain` has `records`, `status`, `ssl`, `primary`, `failureReason`.

Public request, end to end:

```
GET https://www.mybusiness.com/about
  edge (TLS, on-demand cert, HTTP cache)
    ↓ cache miss
  storefront app
    host → Redis "host:www.mybusiness.com" → { website_id, published_version_id }   ~1 lookup
    snapshot by version → Redis / in-process LRU (immutable, so cache freely)
    page "/about" → sections → HTML
    ↓
  edge caches the HTML, tagged site:<website_id>:v<n>
```

One domain per website is `primary`; the others 301 to it, so SEO sees one canonical host.
The platform subdomain keeps working after a custom domain is connected.

---

## 9. Isolation on shared infrastructure  *(Q9)*

| Concern | Rule |
|---|---|
| Postgres | Every table below `websites` carries `website_id`. The repository layer scopes every query; handlers never pass a client-supplied id straight to a query |
| Authorisation | Middleware resolves `customer_id` from the session, then asserts `website.customer_id = customer_id` **once**, not in each handler |
| Media | One bucket, key prefix `websites/<website_id>/`; presigned uploads; the customer's own S3 bucket where they connected one (your `storage` module already models BYO-bucket with fallback), so the snapshot must carry the media base URL per website |
| Redis | Namespaced keys `ryugaware:site:<id>:*`, `ryugaware:host:<hostname>` |
| Delivery plane | Tenant comes **only** from the Host header. Never from a query parameter or header a visitor can set |
| Quotas | Websites per customer (your "license allowance"), storage bytes, custom domains |

Still one deployable per plane, no microservices. Modules inside the Go monolith own their tables and
expose narrow interfaces — the pattern already set in `backend/PROJECT_STATE.md`.

---

## 10. Template updates without breaking live websites  *(Q10)*

Websites pin `template_version_id`. Releasing a new version therefore changes **nothing** for
existing sites until someone opts in.

| Change | Example | Handling |
|---|---|---|
| **Patch** | CSS fix, accessibility fix, bug in a section | Safe to roll forward automatically within the same major |
| **Minor** | New optional section type, new optional field | Safe; existing content still validates |
| **Major** | Section removed or renamed, field type changed, layout rework | Needs a declared migration **and** an explicit customer action |

Major upgrade flow: *Upgrade available* → run the version's migration against a **copy of the draft**
→ customer previews → publish. Their published site stays on the old version the whole time.

Keep old version code in the storefront bundle (loaded per version) until no website pins it; a
simple count per `template_version_id` tells you when retiring is safe.

---

## 11. Worked example: one customer, ten websites, ten domains

Customer `cus_7f2` (Priya, Bloom Studio) creates:

| Website | Template version | Subdomain | Custom domain |
|---|---|---|---|
| Bloom Studio | `boutique@1.4.0` | `bloom.ryugaware.site` | `www.bloomstudio.in` |
| Priya Portfolio | `studio@2.0.1` | `priya.ryugaware.site` | `priya.design` |
| Mango Mart | `market@3.1.0` | `mangomart.ryugaware.site` | `www.mangomart.in` |
| … 7 more | … | … | … |

Rows after creating Bloom Studio:

```
websites        1 row   template_version_id = boutique@1.4.0, status = draft
website_settings 1 row
website_themes   1 row  { primary: "#B8341A", font: "Inter", radius: 10 }
pages            5 rows /, /about, /contact, /shipping, /returns
page_sections   18 rows hero, featured, usp_strip, testimonials, contact …
navigations      2 rows header, footer
domains          1 row  bloom.ryugaware.site (platform, active)
```

She edits the hero heading → one `UPDATE page_sections SET settings_json = … WHERE id = …`, scoped to
her website. Nothing else in the system is touched. She previews, publishes → `site_versions` row #1,
`published_version_id` set, cache purged. She adds `www.bloomstudio.in`, adds the CNAME, we verify and
issue a certificate; `bloom.ryugaware.site` keeps working and 301s to the primary.

Her other nine websites are identical in shape and completely independent — different template
versions, different themes, different domains, same infrastructure, zero extra deployments.

---

## 12. What this means for this repo

**Deployables**

| Name | What | Status |
|---|---|---|
| `frontend/` | Admin dashboard (the control plane UI) | exists, dummy data |
| `backend/` | Go API: control plane + public read API | stage 4 of 18 |
| `storefront/` | Public renderer for every published website | **to create** |
| edge | TLS termination, on-demand certs, HTTP cache (Caddy or a CDN) | **to set up** |

**Backend modules to add to the planned list in `backend/PROJECT_STATE.md`**

| Module | Owns |
|---|---|
| `template` | `templates`, `template_versions` (manifest + preset) |
| `site` | `websites`, `website_settings`, `website_themes`, `pages`, `page_sections`, `navigations` |
| `media` | `media_assets` on top of `platform/storage` |
| `domain` | `domains`, verification, certificate state |
| `publishing` | `site_versions`, publish / unpublish / rollback, cache invalidation |
| `delivery` | public read-only API the storefront calls (host resolve, snapshot fetch) |

**Events** (Redis Streams, the transport already chosen): `site.published`, `site.unpublished`,
`domain.verified`, `domain.failed`, `media.uploaded` → consumers: cache purge, audit, notifications.

**Build order**

1. `template` + `site` + instantiation — create a website from a preset, inspect the rows. No UI yet.
2. `storefront/` with one template, rendering **draft** data by website id. Proves the renderer.
3. `publishing` — snapshots, publish/rollback. Storefront switches to published snapshots.
4. Host resolution + platform subdomains. First real public URL.
5. Admin editing UI — pages list, section editor from the schema, media, theme, preview.
6. Custom domains + on-demand TLS.
7. Second and third templates — this is where the schema-driven design pays off.
8. Catalogue (products, collections, orders) for ecommerce templates — a large module in its own right.

---

## 13. Open decisions

1. **Ecommerce scope.** Your landing page promises products, stock, orders, payments and delivery, and
   the admin already has payments / delivery / customers / shopper auth — but there is no products or
   orders module anywhere yet. That is the heaviest part of the build and it is orthogonal to this
   architecture. Decide whether the first templates are content-only (business, portfolio) and
   ecommerce comes later.
2. **Rendering strategy.** SSR + edge cache + purge on publish (recommended: simple, dynamic parts
   stay possible) versus static export per publish (faster, but a build step per publish and awkward
   for carts and shopper sessions).
3. **Edge.** Caddy with on-demand TLS that we run, versus a CDN with a custom-hostname API. Affects
   cost, control and how fast custom domains go live.
4. **Where the storefront reads from.** A public read API in the Go monolith (recommended: one place
   owns the data) versus the storefront reading Postgres directly (fewer hops, more coupling).
5. **Multi-language.** If it is ever wanted, `pages` needs a `locale` from the start — retrofitting it
   is expensive.
