/**
 * Demo catalogue for the Aurelia template.
 *
 * Template-owned sample data: every website created from this template browses the same products,
 * exactly as a real template ships with demo content until the merchant loads their own. A real
 * catalogue module (products, stock, orders) is a separate backend concern — see docs/ARCHITECTURE.md.
 */
import type { Category, Product, ProductTag, Review } from "../../types";

const img = (name: string) => `/images/products/${name}.webp`;

export const CATEGORIES: Category[] = [
  { id: "cat_apparel", slug: "apparel", name: "Apparel", blurb: "Everyday cotton and linen, cut to last.", image: img("tee-sage") },
  { id: "cat_accessories", slug: "accessories", name: "Accessories", blurb: "Bags, wallets and the small things.", image: img("leather-tote") },
  { id: "cat_home", slug: "home", name: "Home", blurb: "Table, kitchen and quiet corners.", image: img("ceramic-cups") },
  { id: "cat_tech", slug: "tech", name: "Tech", blurb: "Sound, screens and everything charged.", image: img("headphones") },
  { id: "cat_pantry", slug: "pantry", name: "Pantry", blurb: "Small-batch food from growers we know.", image: img("olive-oil") },
];

interface Seed {
  slug: string;
  name: string;
  categoryId: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  summary: string;
  description: string;
  specs: [string, string][];
  variantLabel: string;
  variants: string[];
  outOfStock?: string[];
  stock: number;
  rating: number;
  reviewCount: number;
  tags?: ProductTag[];
}

const SEEDS: Seed[] = [
  {
    slug: "ecru-heavyweight-tee", name: "Ecru heavyweight tee", categoryId: "cat_apparel", price: 1890, compareAtPrice: 2290, image: "tee-ecru",
    summary: "280 GSM combed cotton, unbleached and undyed.",
    description: "A heavy, honest t-shirt in unbleached cotton. It holds its shape through a hundred washes and softens without thinning. Cut a touch boxy through the body with a set-in sleeve.",
    specs: [["Fabric", "280 GSM combed cotton"], ["Fit", "Boxy, true to size"], ["Care", "Machine wash cold, dry flat"], ["Made in", "Tiruppur, Tamil Nadu"]],
    variantLabel: "Size", variants: ["S", "M", "L", "XL"], outOfStock: ["S"], stock: 38, rating: 4.6, reviewCount: 128, tags: ["bestseller", "sale"],
  },
  {
    slug: "sage-knit-tee", name: "Sage knit tee", categoryId: "cat_apparel", price: 1690, image: "tee-sage",
    summary: "A soft dusty sage knit for the in-between months.",
    description: "Fine-gauge knit with a clean neckline and a slightly longer body. The colour is dyed in small lots, so no two runs are identical.",
    specs: [["Fabric", "Cotton-modal knit"], ["Fit", "Regular"], ["Care", "Hand wash, dry flat"], ["Made in", "Ludhiana, Punjab"]],
    variantLabel: "Size", variants: ["S", "M", "L", "XL"], stock: 52, rating: 4.4, reviewCount: 74, tags: ["new"],
  },
  {
    slug: "olive-pocket-tee", name: "Olive pocket tee", categoryId: "cat_apparel", price: 1590, image: "tee-olive",
    summary: "Textured slub cotton with a single chest pocket.",
    description: "Slub yarn gives the surface a little life, so it never looks flat. The pocket is cut on the grain and bar-tacked at both corners.",
    specs: [["Fabric", "Slub cotton jersey"], ["Fit", "Regular"], ["Care", "Machine wash cold"], ["Made in", "Tiruppur, Tamil Nadu"]],
    variantLabel: "Size", variants: ["S", "M", "L", "XL"], stock: 61, rating: 4.3, reviewCount: 46,
  },
  {
    slug: "charcoal-boxy-tee", name: "Charcoal boxy tee", categoryId: "cat_apparel", price: 1790, image: "tee-charcoal",
    summary: "Washed black with a premium boxy drop shoulder.",
    description: "Garment-washed so it arrives already soft and already shrunk. The drop shoulder sits wide without looking oversized.",
    specs: [["Fabric", "240 GSM cotton, garment washed"], ["Fit", "Boxy, drop shoulder"], ["Care", "Machine wash cold, inside out"], ["Made in", "Tiruppur, Tamil Nadu"]],
    variantLabel: "Size", variants: ["S", "M", "L", "XL"], outOfStock: ["XL"], stock: 24, rating: 4.7, reviewCount: 93, tags: ["bestseller"],
  },
  {
    slug: "cream-crewneck", name: "Cream organic crewneck", categoryId: "cat_apparel", price: 2490, image: "tee-cream",
    summary: "Organic heavyweight cotton, ribbed at the collar and cuff.",
    description: "A crewneck built like outerwear: thick loopback cotton, a reinforced collar and side seams that stay straight after washing.",
    specs: [["Fabric", "340 GSM organic loopback"], ["Fit", "Regular"], ["Care", "Machine wash cold"], ["Made in", "Tiruppur, Tamil Nadu"]],
    variantLabel: "Size", variants: ["S", "M", "L", "XL"], stock: 19, rating: 4.8, reviewCount: 57, tags: ["new"],
  },
  {
    slug: "unbleached-linen-shirt", name: "Unbleached linen shirt", categoryId: "cat_apparel", price: 3290, compareAtPrice: 3990, image: "linen-shirt",
    summary: "A button-down in raw linen that gets better creased.",
    description: "European flax, woven and finished in India. Wear it open over a tee or buttoned with the sleeves rolled. It wrinkles — that is the point.",
    specs: [["Fabric", "100% linen, 160 GSM"], ["Fit", "Relaxed"], ["Care", "Machine wash cold, line dry"], ["Made in", "Kannur, Kerala"]],
    variantLabel: "Size", variants: ["S", "M", "L", "XL"], stock: 27, rating: 4.5, reviewCount: 61, tags: ["sale"],
  },
  {
    slug: "leather-tote", name: "Full-grain leather tote", categoryId: "cat_accessories", price: 8900, image: "leather-tote",
    summary: "One piece of full-grain hide, lined and hand-stitched.",
    description: "Minimal hardware, a wide opening and a base that holds its shape when the bag is empty. The leather darkens where you hold it.",
    specs: [["Material", "Full-grain vegetable-tanned leather"], ["Size", "38 × 32 × 12 cm"], ["Lining", "Cotton canvas"], ["Made in", "Chennai, Tamil Nadu"]],
    variantLabel: "Colour", variants: ["Tan", "Black"], stock: 12, rating: 4.9, reviewCount: 38, tags: ["bestseller"],
  },
  {
    slug: "canvas-duffel", name: "Natural canvas duffel", categoryId: "cat_accessories", price: 5400, image: "canvas-duffel",
    summary: "Unbleached 18 oz canvas with leather handles.",
    description: "Big enough for three days, soft enough to squash into an overhead bin. Brass zip, webbing shoulder strap, two inside pockets.",
    specs: [["Material", "18 oz cotton canvas"], ["Size", "52 × 28 × 26 cm"], ["Hardware", "Solid brass"], ["Made in", "Jaipur, Rajasthan"]],
    variantLabel: "Colour", variants: ["Natural", "Olive"], stock: 21, rating: 4.4, reviewCount: 29,
  },
  {
    slug: "slim-cardholder", name: "Slim leather cardholder", categoryId: "cat_accessories", price: 1990, image: "cardholder",
    summary: "Four pockets, one fold, no bulk.",
    description: "Cut from the same hide as the tote. It starts tight and loosens to your cards over a fortnight.",
    specs: [["Material", "Full-grain leather"], ["Capacity", "6–8 cards"], ["Size", "10 × 7 cm"], ["Made in", "Chennai, Tamil Nadu"]],
    variantLabel: "Colour", variants: ["Tan", "Black", "Oxblood"], stock: 44, rating: 4.5, reviewCount: 82,
  },
  {
    slug: "acetate-sunglasses", name: "Tortoiseshell sunglasses", categoryId: "cat_accessories", price: 4200, compareAtPrice: 4800, image: "sunglasses",
    summary: "Hand-polished acetate with polarised lenses.",
    description: "A keyhole bridge and a frame that is thick without being heavy. Comes in a hard case with a cloth.",
    specs: [["Frame", "Italian acetate"], ["Lens", "Polarised, UV400"], ["Width", "142 mm"], ["Case", "Included"]],
    variantLabel: "Lens", variants: ["Green", "Brown"], stock: 18, rating: 4.2, reviewCount: 41, tags: ["sale"],
  },
  {
    slug: "white-leather-sneakers", name: "White leather sneakers", categoryId: "cat_accessories", price: 6900, image: "sneakers",
    summary: "Low tops on a vulcanised rubber sole.",
    description: "Minimal, unlined, with a cupsole that can be resoled. They crease across the toe within a week and look better for it.",
    specs: [["Upper", "Full-grain leather"], ["Sole", "Vulcanised rubber"], ["Lining", "Unlined"], ["Made in", "Agra, Uttar Pradesh"]],
    variantLabel: "Size", variants: ["7", "8", "9", "10", "11"], outOfStock: ["7"], stock: 33, rating: 4.3, reviewCount: 67, tags: ["new"],
  },
  {
    slug: "speckled-ceramic-cups", name: "Speckled ceramic cups", categoryId: "cat_home", price: 1450, image: "ceramic-cups",
    summary: "A pair of hand-thrown cups, 220 ml each.",
    description: "Thrown and glazed in a studio in Pondicherry. The speckle comes from iron in the clay, so every pair differs a little.",
    specs: [["Material", "Stoneware"], ["Capacity", "220 ml"], ["Set", "2 cups"], ["Care", "Dishwasher safe"]],
    variantLabel: "Glaze", variants: ["Oatmeal", "Slate"], stock: 29, rating: 4.7, reviewCount: 52, tags: ["bestseller"],
  },
  {
    slug: "wireless-headphones", name: "Over-ear headphones", categoryId: "cat_tech", price: 18900, compareAtPrice: 21900, image: "headphones",
    summary: "40 hours, active noise cancelling, matte finish.",
    description: "Memory-foam ear cups, a flat-folding hinge and a cable port for when the battery finally goes. Tuned warm rather than bright.",
    specs: [["Battery", "40 hours ANC on"], ["Drivers", "40 mm"], ["Bluetooth", "5.3, multipoint"], ["Weight", "263 g"]],
    variantLabel: "Colour", variants: ["Charcoal", "Sand"], stock: 15, rating: 4.6, reviewCount: 214, tags: ["bestseller", "sale"],
  },
  {
    slug: "portable-speaker", name: "Compact portable speaker", categoryId: "cat_tech", price: 7400, image: "speaker",
    summary: "Pocket-sized, waterproof, surprisingly loud.",
    description: "IPX7, 14 hours of playback and a strap that clips to a bag. Pair two for stereo.",
    specs: [["Battery", "14 hours"], ["Rating", "IPX7"], ["Weight", "480 g"], ["Pairing", "Stereo pair supported"]],
    variantLabel: "Colour", variants: ["Slate", "Clay"], stock: 26, rating: 4.1, reviewCount: 88,
  },
  {
    slug: "titanium-smartphone", name: "Titanium smartphone", categoryId: "cat_tech", price: 79900, image: "smartphone",
    summary: "6.7-inch display, titanium frame, three cameras.",
    description: "The flagship, without the gimmicks. Two-day battery, a camera that handles Indian evening light, and seven years of updates.",
    specs: [["Display", "6.7-inch OLED, 120 Hz"], ["Storage", "256 GB / 512 GB"], ["Battery", "5000 mAh"], ["Warranty", "2 years"]],
    variantLabel: "Storage", variants: ["256 GB", "512 GB"], stock: 9, rating: 4.8, reviewCount: 311, tags: ["new", "bestseller"],
  },
  {
    slug: "matte-smart-watch", name: "Matte black smart watch", categoryId: "cat_tech", price: 24900, image: "smartwatch",
    summary: "Steel case, sapphire glass, nine-day battery.",
    description: "Reads in sunlight, survives the gym, and does not need charging on a weekend away.",
    specs: [["Case", "42 mm stainless steel"], ["Glass", "Sapphire"], ["Battery", "9 days"], ["Water", "5 ATM"]],
    variantLabel: "Band", variants: ["Rubber", "Leather", "Steel"], stock: 17, rating: 4.4, reviewCount: 126, tags: ["new"],
  },
  {
    slug: "alphonso-mangoes", name: "Alphonso mangoes, box of 6", categoryId: "cat_pantry", price: 1250, image: "mangoes",
    summary: "Ratnagiri Alphonso, picked ripe, packed same day.",
    description: "From a single orchard in Devgad. Shipped at the stage where they need two days on a windowsill. Seasonal: April to June.",
    specs: [["Origin", "Devgad, Maharashtra"], ["Count", "6 mangoes, ~1.5 kg"], ["Season", "April–June"], ["Storage", "Room temperature"]],
    variantLabel: "Box", variants: ["6 pieces", "12 pieces"], stock: 48, rating: 4.9, reviewCount: 176, tags: ["bestseller"],
  },
  {
    slug: "cold-pressed-olive-oil", name: "Stone-ground olive oil", categoryId: "cat_pantry", price: 1850, image: "olive-oil",
    summary: "First cold press, 500 ml, dark glass.",
    description: "Pressed within six hours of picking. Grassy and slightly peppery at the back of the throat — good raw, wasted on heat.",
    specs: [["Volume", "500 ml"], ["Acidity", "< 0.3%"], ["Harvest", "2026"], ["Bottle", "UV-resistant glass"]],
    variantLabel: "Size", variants: ["500 ml", "1 L"], stock: 36, rating: 4.5, reviewCount: 64,
  },
  {
    slug: "sourdough-loaf", name: "Organic sourdough loaf", categoryId: "cat_pantry", price: 420, image: "sourdough",
    summary: "36-hour ferment, baked the morning it ships.",
    description: "Stone-milled flour, sea salt, water, time. Nothing else. Delivered the day it is baked within the city.",
    specs: [["Weight", "800 g"], ["Ferment", "36 hours"], ["Flour", "Stone-milled, organic"], ["Keeps", "4 days"]],
    variantLabel: "Loaf", variants: ["Classic", "Seeded"], stock: 22, rating: 4.7, reviewCount: 98, tags: ["new"],
  },
  {
    slug: "handmade-tagliatelle", name: "Handmade tagliatelle", categoryId: "cat_pantry", price: 540, compareAtPrice: 640, image: "tagliatelle",
    summary: "Bronze-cut, slow-dried, 500 g.",
    description: "Rough enough to hold a sauce. Cooks in four minutes and finishes in the pan with whatever you have.",
    specs: [["Weight", "500 g"], ["Cut", "Bronze die"], ["Drying", "36 hours at low temperature"], ["Cook", "4 minutes"]],
    variantLabel: "Pack", variants: ["500 g", "2 × 500 g"], stock: 41, rating: 4.3, reviewCount: 37, tags: ["sale"],
  },
];

export const PRODUCTS: Product[] = SEEDS.map((s, i) => ({
  id: `prd_${String(i + 1).padStart(3, "0")}`,
  slug: s.slug,
  name: s.name,
  categoryId: s.categoryId,
  price: s.price,
  compareAtPrice: s.compareAtPrice ?? null,
  image: img(s.image),
  images: [img(s.image), CATEGORIES.find((c) => c.id === s.categoryId)!.image, img(SEEDS[(i + 3) % SEEDS.length].image)],
  summary: s.summary,
  description: s.description,
  specs: s.specs.map(([label, value]) => ({ label, value })),
  variantLabel: s.variantLabel,
  variants: s.variants.map((label, vi) => ({
    id: `${s.slug}-v${vi + 1}`,
    label,
    inStock: !(s.outOfStock ?? []).includes(label),
  })),
  stock: s.stock,
  rating: s.rating,
  reviewCount: s.reviewCount,
  tags: s.tags ?? [],
}));

const REVIEW_SEEDS: [string, string, number, string, string, string][] = [
  ["ecru-heavyweight-tee", "Ananya Iyer", 5, "Exactly the weight I wanted", "I have bought three now. It is the only tee I own that does not go see-through at the shoulders.", "2026-10-28"],
  ["ecru-heavyweight-tee", "Rohit Shetty", 4, "Great, but order one size down", "The boxy cut runs wide. Fabric is excellent for the price.", "2026-10-11"],
  ["ecru-heavyweight-tee", "Meera Nair", 5, "Washes beautifully", "Six weeks in, no pilling and no fading. Shipping to Kochi took three days.", "2026-09-30"],
  ["charcoal-boxy-tee", "Kabir Malhotra", 5, "The drop shoulder is perfect", "Looks expensive. The washed black has not turned grey yet.", "2026-11-02"],
  ["charcoal-boxy-tee", "Sneha Reddy", 4, "Soft from day one", "No break-in period at all. Took off a star because XL was out of stock for a month.", "2026-10-19"],
  ["leather-tote", "Priya Desai", 5, "Worth every rupee", "Carries a laptop, a tiffin and a water bottle without sagging. The tan has darkened nicely.", "2026-10-25"],
  ["leather-tote", "Arjun Pillai", 5, "Beautiful stitching", "Bought it for my wife. The edges are hand-finished, you can tell immediately.", "2026-09-14"],
  ["wireless-headphones", "Nikhil Bose", 5, "ANC handles the metro", "Drowns out the entire Blue Line. Battery genuinely lasts the week.", "2026-11-05"],
  ["wireless-headphones", "Tanvi Shah", 4, "Warm sound, slightly tight", "Lovely for podcasts. The clamp is firm for the first few days.", "2026-10-21"],
  ["wireless-headphones", "Imran Qureshi", 5, "Replaced a pair twice the price", "No complaints at all after two months of daily use.", "2026-10-02"],
  ["alphonso-mangoes", "Lakshmi Krishnan", 5, "Tasted like childhood", "Arrived firm, ripened in two days on the counter. Not one bruised piece.", "2026-05-18"],
  ["alphonso-mangoes", "Vikram Joshi", 5, "Ordered four boxes", "Sent two to my parents in Pune. They called to ask where I got them.", "2026-05-09"],
  ["speckled-ceramic-cups", "Divya Menon", 5, "Lovely weight in the hand", "The glaze is even prettier in daylight. Packed very carefully.", "2026-10-07"],
  ["white-leather-sneakers", "Aditya Rao", 4, "Comfortable out of the box", "No blisters on day one. Wish they came in half sizes.", "2026-10-30"],
  ["unbleached-linen-shirt", "Fatima Sheikh", 5, "Perfect for Chennai heat", "Breathes properly. I have stopped ironing it and it looks better.", "2026-09-22"],
  ["titanium-smartphone", "Harshil Patel", 5, "Battery is the headline", "Two full days with heavy use. The camera in low light is a real upgrade.", "2026-11-01"],
  ["sourdough-loaf", "Ritika Agarwal", 5, "Best crust in the city", "Arrived still slightly warm. Gone by the next morning.", "2026-11-08"],
  ["cold-pressed-olive-oil", "Gaurav Khanna", 4, "Properly peppery", "You can taste it is fresh. The litre bottle is better value.", "2026-10-15"],
];

export const REVIEWS: Review[] = REVIEW_SEEDS.map(([slug, author, rating, title, body, date], i) => ({
  id: `rev_${String(i + 1).padStart(3, "0")}`,
  productId: PRODUCTS.find((p) => p.slug === slug)!.id,
  author,
  rating,
  title,
  body,
  date,
}));

/* ------------------------------ selectors ------------------------------ */

export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);
export const productBySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug);
export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);

export type ShowcaseSource = "featured" | "new" | "bestsellers" | "sale";

export function productsBySource(source: ShowcaseSource, limit: number): Product[] {
  const pool =
    source === "new" ? PRODUCTS.filter((p) => p.tags.includes("new"))
    : source === "bestsellers" ? PRODUCTS.filter((p) => p.tags.includes("bestseller"))
    : source === "sale" ? PRODUCTS.filter((p) => p.compareAtPrice !== null)
    : PRODUCTS;
  const list = pool.length >= limit ? pool : [...pool, ...PRODUCTS.filter((p) => !pool.includes(p))];
  return list.slice(0, limit);
}

export const relatedProducts = (product: Product, limit = 4) =>
  PRODUCTS.filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .concat(PRODUCTS.filter((p) => p.categoryId !== product.categoryId && p.id !== product.id))
    .slice(0, limit);

export const reviewsFor = (productId: string) => REVIEWS.filter((r) => r.productId === productId);

export function ratingBreakdown(reviews: Review[]) {
  const counts = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((r) => r.rating === stars).length }));
  const total = reviews.length;
  return counts.map((c) => ({ ...c, share: total ? c.count / total : 0 }));
}
