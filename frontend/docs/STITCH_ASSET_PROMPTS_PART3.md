# Stitch asset prompts, part 3: better Landing and Auth imagery

This **replaces** the landing and auth image prompts in part 1 (`landing/hero-store.png`, `auth/brand-panel.png`, and the CSS-drawn
ember circles). The current versions are flat placeholder blocks; these prompts ask for real-looking product UI and product photography.

## What the research says (and how it shaped the prompts)

* **Show real product UI, not abstract art, in a SaaS hero.** Several 2026 sources say screenshots / real interface beat generic illustration or stock imagery.
  Use illustration only as a small, consistent "spot" system for features, not one big hero picture. (Vendor and agency blogs, so treat as practitioner opinion, not measured data.)
* **For an ecommerce builder the hero should still show a store with believable products.** Shopify guidance and agency studies describe the main hero archetypes as lifestyle photography, clean product packshots, video, and text-led. Keep products easy to identify in lifestyle shots.
* **Move away from generic 3D shapes** toward product-specific visuals.
* **Auth screens:** split layout is the norm; the heading belongs with the form (already how the app is built); imagery should be high quality, on-brand and *restrained* so it never competes with the form; avoid photos of identifiable people (they age badly and cause rework).

So: landing hero = a believable storefront with real product photography plus two floating admin cards (orders, revenue). Features = one consistent set of mini-UI "spot" visuals. Auth = calm still-life photography and refined layered UI on dark, no faces.

## How to use

Same as parts 1 and 2: one Stitch project, **Web** mode, paste the **Global style block from part 1**, then one prompt, then export with the filename below into `public/`.
Photographic boards may come out as UI-style renders in Stitch. If that happens, run the same prompt text in an image model and keep the filename.
Rasters export at 2x (sizes below are 1x). Use JPG for photos without transparency, PNG where transparency is needed.

## Manifest

| File (under `public/images/`) | Size (1x) | Format | Used by |
|---|---|---|---|
| `landing/hero.png` | 1600 x 1100 | PNG, transparent | Landing hero (replaces browser mock) |
| `landing/feature-templates.png` | 560 x 360 | PNG | Feature: ready-made template |
| `landing/feature-domain.png` | 560 x 360 | PNG | Feature: your own web address |
| `landing/feature-products.png` | 560 x 360 | PNG | Feature: products and inventory |
| `landing/feature-payments.png` | 560 x 360 | PNG | Feature: payments and cash on delivery |
| `landing/feature-delivery.png` | 560 x 360 | PNG | Feature: delivery zones and rates |
| `landing/feature-admin.png` | 560 x 360 | PNG | Feature: admin panel for every website |
| `landing/step-1-choose.png`, `step-2-add.png`, `step-3-publish.png` | 360 x 240 | PNG | How it works, 3 steps |
| `landing/cta-bg.jpg` | 1440 x 560 | JPG | Final call to action background (dark) |
| `auth/panel-1.jpg` | 1120 x 1800 | JPG | Login, forgot password |
| `auth/panel-2.jpg` | 1120 x 1800 | JPG | Register, verify email |
| `auth/panel-3.jpg` | 1120 x 1800 | JPG | Reset password, status screens |

---

## Prompt 15: Landing hero

```text
Create one board "hero" 1600x1100 on a TRANSPARENT background. It is a layered product composition that will sit on a cream page, so no background fill and no browser chrome beyond what is described.

Main element: a flat, believable browser window (white, 1px #E2D6C6 border, radius 14, soft shadow 0 24 64 rgba(20,16,15,0.16)), 1180x760, slightly left of centre. Inside it a complete, realistic homepage of a boutique fashion store named "Rose": announcement bar in plum #7C3A55, header with serif logo (DM Serif Display), nav "New in, Dresses, Tailoring, Lookbook", search and bag icons; a full-width hero with a serif headline "The Autumn Edit", a plum "Shop the edit" button and, on the right, a high-quality studio photograph of a dusty-rose silk dress on a mannequin against a blush backdrop; below it a row of four product cards with real product photography (blazer, skirt, knit, camisole), names and prices in rupees (Rs 6,990 etc.). Photography must look like clean e-commerce studio shots, soft daylight, no people, no text on the photos.

Two floating admin cards overlapping the window's right and bottom-left edges, each white, 1px #E2D6C6 border, radius 12, same soft shadow:
1. Right (320x150): header "New order" with a small green dot, "MA-10482 · Rs 5,036", "Priya S. · UPI · just now", and a small "Paid" chip in green.
2. Bottom-left (360x190): title "Revenue, last 30 days", the figure "Rs 18,42,350" in Space Grotesk 600, a green "up 12.4%" chip and a clean 30-point sparkline in Ink with the last point in Ember.

A small round Ember #F0502D badge (72px) with a white check icon on the top-left corner of the window, as the only use of ember.
All text real and crisp, no lorem ipsum, no gradients, no 3D shapes.
```

## Prompt 16: Feature visuals, one consistent set (six PNG boards)

```text
Create six boards, each 560x360, transparent background, one consistent "mini-UI spot" system: every board is a small composition of 2 or 3 overlapping white cards (1px #E2D6C6 border, radius 12, shadow 0 8 24 rgba(20,16,15,0.10)) on top of a soft Cream-2 #F3ECE2 rounded panel (radius 20), with ONE Ink #14100F accent tile carrying an Ember-glow #FF8F63 line icon, and at most one tiny Ember #F0502D dot. Real text only, Inter 12-14px, no lorem ipsum, no gradients, no people.
1. feature-templates: three template thumbnails in a row (a tan classic store, a blush boutique, a green grocery), the middle one selected with a plum check, caption "Classic Store, Modern Boutique, Fresh Market".
2. feature-domain: a browser address bar card showing "shop.bloomstudio.com" with a green lock, and a smaller card below with the DNS record "CNAME www -> cname.ryugaware.com" and a green "Verified" chip.
3. feature-products: a compact product table card (thumbnail, name, price, stock) with 4 rows, e.g. "Silk Slip Dress, Rs 6,990, 24 in stock", plus a small "Low stock" amber chip on one row.
4. feature-payments: a checkout payment card listing "UPI", "Cards", "Net banking", "Cash on delivery" as radio rows with "UPI" selected, and a small "Payment successful" toast card overlapping it.
5. feature-delivery: a flat abstract map card of India with three shaded delivery zones (no place names) and a rate card "Metro cities Rs 99, All India Rs 60".
6. feature-admin: a dashboard card with a left mini-sidebar (Orders, Products, Customers), an orders list with two rows and status chips, and a small revenue sparkline card overlapping.
```

## Prompt 17: How-it-works steps (three PNG boards)

```text
Create three boards 360x240, transparent background, same spot-UI style as the feature visuals (white cards with 1px #E2D6C6 border, radius 12, soft shadow, Ink accent tile with an Ember-glow icon). No people, no lorem ipsum.
1. step-1-choose: a 2x2 grid of tiny storefront thumbnails (tan, blush, green, lavender) with one selected by a plum check and a "Use template" button.
2. step-2-add: a product form card with an image upload area showing a dress photo, fields "Name" and "Price", and a primary button "Add product".
3. step-3-publish: a card with the address "bloom-studio.ryugaware.com", a green "Live" chip, and a large primary button "Publish" with a small rocket-free upward arrow icon.
```

## Prompt 18: Final call-to-action background

```text
Create one board "cta-bg" 1440x560 on solid Ink #14100F. Right side: an arc of five overlapping storefront cards (each a small flat homepage with real product photography: a dress, a lamp, a loaf of bread, a yoga mat, a coffee bag) fanned and slightly rotated (up to 8 degrees), white cards with 1px #3A302B borders, partly cropped by the right and top edges, soft shadow. One large thin concentric-circle outline set (1px #3A302B, #2A2321) behind them, and a single solid Ember #F0502D circle (220px) partly hidden behind the cards. The left 55 percent stays empty so a headline can be placed on it. No text, no gradients.
```

## Prompt 19: Auth panel imagery (three variants, calm and restrained)

```text
Create three portrait boards 1120x1800. They are backgrounds for a dark brand panel beside a sign-in form, so they must stay calm and must not compete with the form. NO people, NO faces, NO text, NO logos. Keep the top-left 400x160 area and the vertical band at x 48-520 between y 220 and 520 visually quiet (low contrast) so a logo and headline can sit there.

panel-1: a still-life photograph in warm low light, shot slightly from above: natural linen cloth, two hand-thrown ceramic cups, a brass lamp casting a soft pool of light, a sprig of dried grass; dominant colours deep Ink #14100F shadows, warm Cream highlights, a hint of Ember glow #FF8F63 from the lamp. Shallow depth of field, matte, editorial.

panel-2: a refined layered composition on Ink #14100F: three overlapping storefront UI cards (a boutique homepage, an order card, a revenue sparkline card) at a slight angle, mostly in the lower two thirds, cropped by the edges, thin #3A302B borders, one thin Ember-glow arc line sweeping behind them. Product photography inside the cards looks like clean studio shots.

panel-3: an abstract architectural study: soft diagonal beams of warm light and long shadows across a plaster wall and a stepped plinth, palette Ink, deep brown, Cream and a faint Ember glow; minimal, quiet, high quality photographic texture, no objects.

Export JPG, quality 85.
```

---

## What I will do with them

* Landing: replace the drawn browser mock with `landing/hero.png`, swap the six feature icon tiles for `feature-*.png`, add `step-*.png`, set `cta-bg.jpg` as the call-to-action background.
* Auth: left panel uses `auth/panel-1..3.jpg` (login + forgot, register + verify, reset + status), with a dark scrim behind the headline so contrast stays AA; the form side is unchanged.
* All images go through `next/image` with explicit sizes, `priority` on the hero, descriptive `alt` text for informative images and empty `alt` for decorative ones.
