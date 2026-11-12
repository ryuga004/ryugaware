# Stitch asset prompts, part 2: Storage, Domains, Payments, Delivery, Users, Authentication, Contact

Part 1 (`STITCH_ASSET_PROMPTS.md`) covers brand marks, template thumbnails, the landing hero, storefront product photos and the first empty states.
This part covers the assets used by the seven new admin sections. Same rules: one Stitch project, **Web** mode, paste the
**Global style block from part 1** first, then one prompt below, then export each board with the exact filename.

Drop the files into `public/` at the paths in the manifest. The Next.js build will reference exactly these paths, so please
keep the names. Export illustrations as **SVG**, raster as **PNG** at 2x (the sizes below are the 1x display size; export at double).

## Real brand logos: do not generate them

Stitch (or any image model) will redraw Visa, Mastercard, Razorpay, Google and carrier logos inaccurately, and Google's sign-in button
has strict branding rules. Download these from each brand's official brand kit instead and save them under `public/images/brands/`
as SVG (single colour or full colour, height 24 px at 1x):

`visa.svg`, `mastercard.svg`, `rupay.svg`, `upi.svg`, `razorpay.svg`, `payu.svg`, `paytm.svg`, `google.svg` (the "G" mark),
`aws-s3.svg`, `delhivery.svg`, `bluedart.svg`, `dtdc.svg`

Only the **generic** marks below are generated.

## Manifest

| Group | File (under `public/images/`) | Size (px, 1x) | Used by |
|---|---|---|---|
| Empty states | `empty/storage.svg` | 480 x 480 | Storage, not configured |
| Empty states | `empty/domains.svg` | 480 x 480 | Domains, none connected |
| Empty states | `empty/payments.svg` | 480 x 480 | Payments, no methods / no transactions |
| Empty states | `empty/revenue.svg` | 480 x 480 | Revenue, no data |
| Empty states | `empty/delivery.svg` | 480 x 480 | Delivery, no methods / no shipments |
| Empty states | `empty/users.svg` | 480 x 480 | Users, none yet |
| Empty states | `empty/authentication.svg` | 480 x 480 | Authentication, nothing enabled |
| Empty states | `empty/contact.svg` | 480 x 480 | Contact details, not set up |
| Empty states | `empty/no-results.svg` | 480 x 480 | Any table, filters matched nothing |
| Payment marks | `payments/card.svg`, `upi.svg`, `netbanking.svg`, `wallet.svg`, `cod.svg` | 96 x 64 | Payment method rows, checkout |
| Delivery marks | `delivery/standard.svg`, `express.svg`, `same-day.svg`, `pickup.svg` | 96 x 64 | Delivery method rows |
| Carriers | `carriers/local.svg`, `carriers/self.svg` | 96 x 64 | Generic carrier fallbacks |
| Storage | `storage/connect.svg` | 640 x 320 | Storage intro panel (how it works) |
| Domains | `domains/dns-steps.svg` | 960 x 240 | DNS drawer / empty state (3 steps) |
| Authentication | `auth/preview-email.png` | 480 x 300 | Preview of the email + password sign-in |
| Authentication | `auth/preview-google.png` | 480 x 300 | Preview of the Google sign-in |
| Contact | `contact/map-placeholder.png` | 744 x 200 | Address preview |
| Users | `avatars/a1.png` ... `a12.png` | 128 x 128 | Demo user avatars |

---

## Prompt 9: Empty-state illustrations (nine SVG boards)

```text
Create nine SVG boards, 480x480 each, transparent background, flat, using only Ink #14100F, Ember #F0502D, Ember-glow #FF8F63 and line colour #E2D6C6.
Shared structure for every board: two concentric thin circle outlines (1.5px, #E2D6C6; diameters 360 and 264) centred on the board; in the centre a rounded-square tile 120x120 (radius 28) filled Ink #14100F; inside the tile ONE line icon, Lucide style, 3px stroke, colour Ember-glow #FF8F63, 56px; one small solid Ember #F0502D dot (28px) sitting on the outer ring at the top-right (about 45 degrees). No text, no shadows, no gradients.
The icon on each board:
1. storage: a cloud above a bucket / hard drive.
2. domains: a globe with a small link symbol.
3. payments: a credit card.
4. revenue: a rising line chart with a dot at the end.
5. delivery: a delivery truck.
6. users: two people (head and shoulders, outline only).
7. authentication: a shield with a check mark.
8. contact: an address card (rectangle with a person and two lines).
9. no-results: a magnifying glass with a small x inside the lens. For this board use Ink for the dot instead of Ember.
Name the boards storage, domains, payments, revenue, delivery, users, authentication, contact, no-results.
```

## Prompt 10: Generic payment and delivery marks (SVG)

```text
Create boards 96x64, transparent background, each a rounded rectangle (radius 10) with a 1.5px #E2D6C6 border and white fill, containing one flat single-colour icon in Ink #14100F plus a short label underneath in Inter 500, 11px, Ink-700 #3A302B. NO real brand logos, NO brand colours: these are generic category marks.
Payment marks: "card" (credit card icon, label Card), "upi" (a smartphone with a checkmark, label UPI), "netbanking" (a bank building, label Net banking), "wallet" (a wallet, label Wallet), "cod" (banknotes, label Cash).
Delivery marks: "standard" (box with a truck, label Standard), "express" (a lightning bolt over a box, label Express), "same-day" (a clock over a box, label Same-day), "pickup" (a storefront, label Pickup).
Carrier fallbacks: "local" (a scooter, label Local), "self" (a hand holding a box, label Self).
Export as SVG with the names above.
```

## Prompt 11: How-it-works diagrams (SVG)

```text
Create two SVG boards on a transparent background, flat, palette from the global style block.

1. "connect" 640x320: left, a small flat storefront card (white, 1px #E2D6C6 border, radius 10) labelled "Your website"; middle, a rounded Ink tile with a cloud icon (Ember-glow) labelled "Ryugaware"; right, an Ink-outlined bucket icon labelled "Your S3 bucket". Thin 1.5px arrows (#3A302B) from left to middle to right, with a tiny lock icon above the right arrow. Labels in Inter 500, 14px, Ink.

2. "dns-steps" 960x240: three equal cards in a row (white, 1px #E2D6C6 border, radius 10, 40px gaps) joined by thin arrows. Card 1: a circle with the number 1, title "Add your domain", a small globe icon. Card 2: a circle with 2, title "Add DNS records", a small list icon with three rows. Card 3: a circle with 3, title "SSL is issued", a small padlock with a check. Number circles are solid Ink with Cream text; titles in Space Grotesk 600, 18px; add one 12px Inter line of grey (#5C5046) text under each title ("Enter shop.yourbrand.com", "CNAME and TXT at your DNS provider", "Automatic, usually within minutes").
```

## Prompt 12: Sign-in previews (PNG)

```text
Create two PNG boards, 480x300 each, showing how a CUSTOMER sign-in form looks on a store website (this is a small preview picture, not an app screen). Background Cream #FAF4EC with a centred white card (320px wide, 1px #E2D6C6 border, radius 10, 24px padding), no shadow.
1. "preview-email": title "Sign in" (Space Grotesk 600, 20px), fields "Email" and "Password" (36px high, 1px #D3C4B0 border, radius 6), a full-width solid #B8341A button "Sign in" (white text), and a small link "Forgot password?" under the button.
2. "preview-google": same card and title, but with a full-width white button with a 1px #D3C4B0 border containing the multicolour Google "G" mark on the left and the text "Continue with Google" (Inter 500, 14px), then a thin divider with the word "or" and a compact email field below it.
Use the real Google "G" mark exactly as Google publishes it; do not redraw or recolour it.
```

## Prompt 13: Map placeholder (PNG)

```text
Create one PNG board "map-placeholder" 744x200: a flat, abstract street map with no real place names. Background Cream-2 #F3ECE2; roads as 6px #FFFFFF lines with a 1px #E2D6C6 edge forming an irregular grid with two diagonal avenues; a few blocks filled slightly darker (#EAE0D2); one park block in soft green #DCE8D8; a river as a curved band #CFE0E4. In the centre a map pin (solid Ember #F0502D, white inner circle, 40px tall) with a soft 1px ring around its base. No text, no logos.
```

## Prompt 14: Avatars (12 PNG boards)

```text
Create twelve boards a1..a12, each 128x128, circular crop (the artwork fills a circle, transparent outside). They are abstract avatars, NOT faces and NOT people: flat geometric compositions only. Each uses two or three colours taken from this set: Ink #14100F, Ink-800 #2A2321, Cream #FAF4EC, Cream-2 #F3ECE2, Ember #F0502D (small area only), Ember-glow #FF8F63, rose #D9AEB7, sage #9CC795, sand #D6C7B2, slate #8CA69E.
Use a mix of simple shapes: half circle on a solid ground, two overlapping circles, stacked arcs, a diagonal split, concentric rings, a quarter circle in a corner. All twelve must feel like one family but look clearly different. No text, no initials.
```

---

## What I will do with them

* Replace the SVG placeholders with these files (via `next/image` for rasters, plain `<img>`/inline for SVG) and keep the SVG fallbacks if a file is missing.
* Empty states switch to `/images/empty/<section>.svg`; payment and delivery rows get the 96x64 marks; official brand logos go next to them from `brands/`.
* The Authentication panels show the two `auth/preview-*.png` thumbnails; Contact details shows the map placeholder above the address.
