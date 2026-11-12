# Static assets: Google Stitch prompts

The app currently draws flat SVG placeholders (`ThemeThumbnail`) instead of real images. These prompts generate the real
static assets. Put the exported files at the paths below (all under `public/`), then the code can switch from the
placeholders to `next/image`.

## How to use

1. One Stitch project for everything, **Web** mode. Paste the **Global style block**, then one asset prompt, as one message.
2. Each prompt asks for **one board per asset at its exact pixel size**. Export each board as PNG (or SVG where noted) and save it with the filename in the table.
3. Stitch produces UI-style imagery. For photographic product shots, either accept the clean, flat "studio render" look these prompts ask for, or generate the photos with an image model using the same descriptions and keep the same filenames.
4. If a board comes out the wrong size or has text/UI chrome around it, ask Stitch: "export only the artwork, no frame, exact size WxH".

## File manifest

| Group | File (under `public/`) | Size (px) | Used by |
|---|---|---|---|
| Brand | `brand/logo-mark.svg` | 512 x 512 | Logo, favicon source |
| Brand | `brand/logo-wordmark.svg` | 960 x 192 | Header, auth, footer (light + dark variants) |
| Brand | `favicon.ico` (32), `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180) | as named | Browser / PWA icons |
| Brand | `og-image.png` | 1200 x 630 | Social sharing card |
| Templates | `images/templates/classic-store.png` | 1280 x 800 | Template cards, website cards, preview |
| Templates | `images/templates/modern-boutique.png` | 1280 x 800 | same |
| Templates | `images/templates/fresh-market.png` | 1280 x 800 | same |
| Templates | `images/templates/studio-pro.png` | 1280 x 800 | same |
| Templates | `images/templates/clinic-care.png` | 1280 x 800 | same |
| Templates | `images/templates/bistro-table.png` | 1280 x 800 | same |
| Landing | `images/landing/hero-store.png` | 1600 x 1000 | Landing hero browser mock |
| Empty states | `images/empty/websites.svg`, `images/empty/templates.svg`, `images/empty/error.svg` | 480 x 480 | Empty / error states |
| Auth | `images/auth/brand-panel.png` | 1120 x 1800 | Auth left panel background (optional; currently CSS) |
| Storefront: Classic | `images/storefront/classic/p1.jpg` ... `p8.jpg` | 1200 x 1200 | Product images |
| Storefront: Classic | `images/storefront/classic/hero.jpg` | 1440 x 560 | Home hero |
| Storefront: Boutique | `images/storefront/boutique/p1.jpg` ... `p8.jpg` | 960 x 1248 (4:5.2) | Product images |
| Storefront: Boutique | `images/storefront/boutique/hero.jpg`, `look-1.jpg` ... `look-3.jpg` | 1440 x 640 / 842 x 1040 | Hero, lookbook |
| Storefront: Market | `images/storefront/market/p1.jpg` ... `p8.jpg` | 1200 x 1080 | Product images |
| Storefront: Market | `images/storefront/market/hero.jpg`, `aisle-1.png` ... `aisle-6.png` | 1440 x 420 / 192 x 192 | Hero, aisle icons |

Product names to use (so images match the dummy data):

* **Classic Store:** Linen Shirt, Canvas Tote, Ceramic Mug Set, Desk Lamp, Wool Throw, Leather Wallet, Glass Carafe, Cotton Apron
* **Modern Boutique:** Silk Slip Dress, Wrap Blazer, Pleated Midi Skirt, Cashmere Knit, Satin Camisole, Tailored Trouser, Linen Shirt Dress, Wool Coat
* **Fresh Market:** Alphonso Mangoes, Baby Spinach, Farm Eggs, Sourdough Loaf, Cold-pressed Oil, Basmati Rice, Greek Yogurt, Cherry Tomatoes

---

## Global style block (paste before every prompt)

```text
Project: Ryugaware, a website-builder SaaS for online stores. Generate STATIC ASSETS, not app screens.
Output format: each asset is its own board at the exact pixel size requested. Artwork fills the board edge to edge.
No UI chrome, no browser frame, no device frame, no mock cursors, no watermarks, no lorem ipsum, no emoji.
Tone: calm, precise, a little fierce. Flat, modern, restrained. No gradients washes, no glassmorphism, no 3D, no drop shadows unless stated.
Ryugaware palette: Ink #14100F, Ink-800 #2A2321, Ink-700 #3A302B, Cream #FAF4EC, Cream-2 #F3ECE2, Line #E2D6C6.
Ember #F0502D is an accent for large shapes only (never as text on ember). Ember-deep #B8341A for buttons. Ember-glow #FF8F63 on dark.
Fonts: headings Space Grotesk 600, UI text Inter 400/500. Wordmark only: Orbitron 700, uppercase, letter-spacing 0.09em.
Any text inside artwork must be real, readable, at least 12px at 1x. Realistic content (names, prices in Indian rupees, dates), never placeholder text.
Photography style (when a prompt asks for products): clean studio look, soft diffuse daylight, seamless neutral backdrop, subject centred with generous margin, no people, no text, no props that look like other brands.
```

---

## Prompt 1: Brand marks

```text
Create three boards.
1. "logo-mark" 512x512, transparent background: a rounded-square (radius 112px) filled Ember #F0502D with a bold uppercase letter R in Orbitron 700 centred, Ink #14100F. Flat, no shadow.
2. "logo-wordmark-light" 960x192, transparent background: the mark (192x192) on the left, then the word RYUGAWARE in Orbitron 700, Ink #14100F, letter-spacing 0.09em, vertically centred.
3. "logo-wordmark-dark" 960x192 on solid Ink #14100F: same as above but the word in Cream #FAF4EC.
Also create "favicon-sheet" 4 boards at 32, 180, 192 and 512 px square showing only the mark, with 12% padding, solid Ember rounded square (no transparency) for the 180 apple-touch version.
```

## Prompt 2: Open Graph image

```text
Create one board "og-image" 1200x630 on Cream #FAF4EC. Left half: the Ryugaware mark and wordmark at the top-left (48px margin), then the headline "Launch your online store on your own website" in Space Grotesk 600, 64px, Ink, max 3 lines, and below it "Ready-made templates. Your own web address." in Inter 400, 26px, #5C5046. Right half: a large flat Ember #F0502D circle (440px) partly off the right edge with two thin concentric circle outlines (1px #E2D6C6) around it, and a simplified flat storefront card (white, 1px #E2D6C6 border, radius 10px) overlapping the circle showing a tinted hero block and four product tiles. Nothing else.
```

## Prompt 3: Template thumbnails (generate all six; repeat the prompt per template)

```text
Create one board "<template-slug>" 1280x800: a full-width screenshot-style render of the HOME PAGE of an online-store website, edge to edge (no browser frame). Realistic content, flat design, readable text. Structure: announcement bar, header with logo/nav/search/cart, hero (split layout), a row of category tiles, a row of four product cards with names and prices in rupees, footer hint at the bottom edge.
Use this template identity:

classic-store: brand "MAISON", Inter, navy-black accent #1F2937, warm tan palette (#EFE7DC, #D6C7B2, #C9B79C). Hero headline "Essentials for every day". Products: Linen Shirt Rs 2,499; Canvas Tote Rs 1,299; Ceramic Mug Set Rs 899; Desk Lamp Rs 3,499.
modern-boutique: brand "Rose", elegant serif headline (DM Serif Display), plum accent #7C3A55, blush palette (#F4E4E6, #E8C9CF, #D9AEB7), sharp square corners, editorial large imagery. Hero "The Autumn Edit". Products: Silk Slip Dress Rs 6,990; Wrap Blazer Rs 8,490; Pleated Midi Skirt Rs 3,990; Cashmere Knit Rs 7,490.
fresh-market: brand "Fresh", Manrope bold, green accent #2F6B3A, palette (#E3F0E1, #B9D8B3, #F2D49B), rounded corners, delivery-pincode bar under the header ("Delivering to 400001"). Hero "Fresh from the farm, at your door". Products: Alphonso Mangoes Rs 349; Baby Spinach Rs 49; Farm Eggs Rs 120; Sourdough Loaf Rs 180.
studio-pro: brand "Studio", yoga/fitness studio, indigo accent #4A3F8F, lavender palette (#E7E4F2, #CFC9E6), class schedule table and "Book a class" button instead of products.
clinic-care: brand "Care", medical clinic, teal accent #1F6F78, pale teal palette (#DFEEF0, #B8DADF), doctor profile cards and "Request appointment" button.
bistro-table: brand "Bistro", restaurant, warm brown accent #8A4B1F, cream-orange palette (#F2E3D0, #E5C7A4), menu highlights and "Reserve a table" button.
```

## Prompt 4: Landing hero artwork

```text
Create one board "hero-store" 1600x1000 on a transparent background: a flat render of a clothing-boutique homepage (brand "Rose", blush palette, plum accent #7C3A55) designed to sit inside a browser frame that the website draws itself, so DO NOT include a frame. Top bar, hero with a headline "Soft layers, bold colour" and a plum "Shop now" button on a blush block, a circular image on the right, then four product tiles. Crisp edges, real text, no shadow.
```

## Prompt 5: Empty-state and error graphics (SVG)

```text
Create three SVG boards 480x480 on a transparent background, flat, 2 colours + Ink only (Ink #14100F, Ember #F0502D, line #E2D6C6). Concentric thin circle outlines (1.5px, #E2D6C6) around a central rounded-square tile filled Ink with an Ember-glow #FF8F63 line icon (Lucide style, 2px stroke), plus one small solid Ember dot on the outer ring.
1. "websites": icon = browser window.
2. "templates": icon = layout-template (header block over two columns).
3. "error": icon = alert-circle. Make the small dot Danger #B3261E instead of Ember.
No text.
```

## Prompt 6: Auth brand panel (optional)

```text
Create one board "brand-panel" 1120x1800 on solid Ink #14100F. Bottom-right: a large flat Ember #F0502D circle (680px diameter) cropped by the right and bottom edges, surrounded by three concentric circle outlines (1px, #3A302B, #2A2321, #2A2321) growing outward. Everything else empty so text can sit on top. No gradients, no noise.
```

## Prompt 7: Storefront product images

Run once per template. Each prompt creates eight boards named p1 ... p8.

```text
Create eight boards p1..p8, <SIZE> each, one product per board, studio product shots in the Global photography style. Backdrop colour <BACKDROP>. No text.

Classic Store (SIZE 1200x1200, backdrop #EFE7DC to #E2D6C6 seamless): p1 oat linen shirt neatly folded; p2 natural canvas tote bag standing; p3 set of four handmade ceramic mugs in off-white glaze; p4 brass desk lamp; p5 grey wool throw folded over a stool; p6 tan leather wallet slightly open; p7 clear glass carafe with water; p8 navy cotton apron on a hook.
Modern Boutique (SIZE 960x1248, backdrop #F4E4E6): p1 dusty-rose silk slip dress on a minimal mannequin; p2 ivory wrap blazer; p3 blush pleated midi skirt; p4 mauve cashmere knit sweater; p5 rose satin camisole; p6 sand tailored trousers; p7 white linen shirt dress; p8 camel wool coat. Garments on a mannequin or hanger only, no people.
Fresh Market (SIZE 1200x1080, backdrop #E3F0E1): p1 two ripe Alphonso mangoes; p2 a bunch of baby spinach; p3 a carton of twelve brown farm eggs; p4 a sourdough loaf on a board; p5 a glass bottle of cold-pressed oil; p6 a jute sack of basmati rice with a scoop; p7 a bowl of Greek yogurt; p8 a punnet of cherry tomatoes on the vine.
```

## Prompt 8: Storefront hero and lookbook banners

```text
Create the following boards, Global photography style, no text, subject placed on the right so the left half stays clear for a headline overlay:
- "classic-hero" 1440x560, backdrop #EFE7DC: a styled still life of the Classic Store products (tote, mug set, lamp, folded shirt) on a tan surface.
- "boutique-hero" 1440x640, backdrop #F4E4E6: three garments on a clothing rail, soft window light.
- "boutique-look-1" "boutique-look-2" "boutique-look-3", each 842x1040, blush backdrop: styled flat-lay or mannequin outfits named "The Evening Edit", "Office to Dinner", "Weekend Linen". No people.
- "market-hero" 1440x420, backdrop #E3F0E1: overhead arrangement of fresh produce (mangoes, spinach, tomatoes, eggs, bread) on a pale green surface.
- "aisle-1".."aisle-6", each 192x192, transparent background, flat circular icons (96px circle fill from the Fresh Market palette #B9D8B3/#9CC795/#CFE5CB/#F2D49B/#B9D8B3/#9CC795) with a centred simple Ink line icon: Fruits (apple), Vegetables (carrot), Dairy (milk bottle), Bakery (bread), Pantry (jar), Snacks (cookie).
```

---

## After you export

Drop the files in `public/` at the paths above, then ask for the wiring step. It replaces the placeholders with real images:

* `ThemeThumbnail` -> `next/image` of `/images/templates/<theme>.png` (with the SVG as the fallback),
* landing hero -> `/images/landing/hero-store.png`,
* `EmptyState` -> the SVGs, favicon + metadata icons, `og-image.png` in the root metadata.
