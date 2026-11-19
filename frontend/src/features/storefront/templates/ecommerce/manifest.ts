/**
 * "Aurelia Commerce" — the first platform-owned storefront template.
 *
 * This file is the template's contract: which pages exist, which sections a page allows, and which
 * fields each section exposes. The editor builds its forms from here and the renderer reads the
 * saved values. Adding a section type means adding it here plus one component in
 * `components/sections` — no editor code changes.
 *
 * Platform owned and immutable at runtime: nothing here is ever written to.
 */
import type { FieldDef, SectionDef, TemplateManifest } from "../../types";

const linkField = (key: string, label: string): FieldDef => ({
  key,
  type: "link",
  label,
  help: "Pick a page on this website, or enter a full web address.",
});

const navItems: FieldDef = {
  key: "items",
  type: "list",
  label: "Links",
  itemLabelKey: "label",
  maxItems: 6,
  fields: [
    { key: "label", type: "text", label: "Label", max: 24, required: true },
    linkField("target", "Goes to"),
  ],
};

const SECTIONS: Record<string, SectionDef> = {
  announcement_bar: {
    type: "announcement_bar",
    label: "Announcement bar",
    description: "A thin strip above the header for offers or delivery promises.",
    fixed: true,
    fields: [
      { key: "message", type: "text", label: "Message", max: 90, required: true },
      { key: "linkLabel", type: "text", label: "Link label", max: 24 },
      linkField("linkTarget", "Link goes to"),
    ],
  },
  header: {
    type: "header",
    label: "Header",
    description: "Logo, navigation, search and cart. Appears on every page.",
    fixed: true,
    fields: [
      navItems,
      { key: "showSearch", type: "boolean", label: "Show search" },
      { key: "ctaLabel", type: "text", label: "Button label", max: 20 },
      linkField("ctaTarget", "Button goes to"),
    ],
  },
  footer: {
    type: "footer",
    label: "Footer",
    description: "Closing navigation, contact details and small print.",
    fixed: true,
    fields: [
      { key: "about", type: "textarea", label: "About the store", max: 240 },
      { key: "shopLinks", type: "list", label: "Shop links", itemLabelKey: "label", maxItems: 6, fields: [{ key: "label", type: "text", label: "Label", max: 24, required: true }, linkField("target", "Goes to")] },
      { key: "helpLinks", type: "list", label: "Help links", itemLabelKey: "label", maxItems: 6, fields: [{ key: "label", type: "text", label: "Label", max: 24, required: true }, linkField("target", "Goes to")] },
      { key: "email", type: "text", label: "Contact email", max: 60 },
      { key: "phone", type: "text", label: "Contact phone", max: 24 },
      { key: "note", type: "text", label: "Small print", max: 80 },
    ],
  },
  hero: {
    type: "hero",
    label: "Hero banner",
    description: "The first thing a visitor sees: a headline, a line of copy and your main button.",
    fields: [
      { key: "eyebrow", type: "text", label: "Eyebrow", max: 40 },
      { key: "heading", type: "text", label: "Heading", max: 70, required: true },
      { key: "body", type: "textarea", label: "Supporting text", max: 180 },
      { key: "ctaLabel", type: "text", label: "Button label", max: 24 },
      linkField("ctaTarget", "Button goes to"),
      { key: "secondaryLabel", type: "text", label: "Second button label", max: 24 },
      linkField("secondaryTarget", "Second button goes to"),
      { key: "image", type: "image", label: "Image" },
      { key: "layout", type: "select", label: "Layout", choices: [{ value: "split", label: "Image beside text" }, { value: "full", label: "Full-width image" }] },
    ],
  },
  shop_hero: {
    type: "shop_hero",
    label: "Shop header",
    description: "A compact banner for the shop landing page.",
    fields: [
      { key: "heading", type: "text", label: "Heading", max: 60, required: true },
      { key: "body", type: "textarea", label: "Supporting text", max: 160 },
      { key: "image", type: "image", label: "Background image" },
    ],
  },
  featured_categories: {
    type: "featured_categories",
    label: "Categories",
    description: "Cards that send visitors into a part of the catalogue.",
    fields: [
      { key: "heading", type: "text", label: "Heading", max: 60 },
      { key: "subheading", type: "text", label: "Subheading", max: 120 },
      { key: "limit", type: "number", label: "How many", min: 2, max: 6 },
      { key: "layout", type: "select", label: "Layout", choices: [{ value: "grid", label: "Even grid" }, { value: "feature", label: "One large, rest small" }] },
    ],
  },
  product_showcase: {
    type: "product_showcase",
    label: "Product row",
    description: "A row of products picked by a rule — featured, new arrivals, best sellers or on sale.",
    fields: [
      { key: "heading", type: "text", label: "Heading", max: 60, required: true },
      { key: "subheading", type: "text", label: "Subheading", max: 120 },
      {
        key: "source",
        type: "select",
        label: "Which products",
        help: "The row fills itself from the catalogue, so it stays current as you add products.",
        choices: [
          { value: "featured", label: "Featured" },
          { value: "new", label: "New arrivals" },
          { value: "bestsellers", label: "Best sellers" },
          { value: "sale", label: "On sale" },
        ],
      },
      { key: "limit", type: "number", label: "How many", min: 2, max: 8 },
      { key: "ctaLabel", type: "text", label: "Link label", max: 24 },
      linkField("ctaTarget", "Link goes to"),
    ],
  },
  promo_banner: {
    type: "promo_banner",
    label: "Promotional banner",
    description: "A full-width band for a campaign, an offer or a seasonal message.",
    fields: [
      { key: "eyebrow", type: "text", label: "Eyebrow", max: 40 },
      { key: "heading", type: "text", label: "Heading", max: 70, required: true },
      { key: "body", type: "textarea", label: "Supporting text", max: 180 },
      { key: "ctaLabel", type: "text", label: "Button label", max: 24 },
      linkField("ctaTarget", "Button goes to"),
      { key: "image", type: "image", label: "Image" },
      { key: "tone", type: "select", label: "Style", choices: [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "accent", label: "Brand colour" }] },
    ],
  },
  brand_intro: {
    type: "brand_intro",
    label: "About the brand",
    description: "Your story, with a picture and a few numbers worth boasting about.",
    fields: [
      { key: "eyebrow", type: "text", label: "Eyebrow", max: 40 },
      { key: "heading", type: "text", label: "Heading", max: 70, required: true },
      { key: "body", type: "textarea", label: "Body", max: 400 },
      { key: "image", type: "image", label: "Image" },
      { key: "ctaLabel", type: "text", label: "Button label", max: 24 },
      linkField("ctaTarget", "Button goes to"),
      {
        key: "stats",
        type: "list",
        label: "Numbers",
        itemLabelKey: "label",
        maxItems: 4,
        fields: [
          { key: "value", type: "text", label: "Value", max: 12, required: true },
          { key: "label", type: "text", label: "Label", max: 28, required: true },
        ],
      },
    ],
  },
  testimonials: {
    type: "testimonials",
    label: "Testimonials",
    description: "What customers say. Three or four short quotes work best.",
    fields: [
      { key: "heading", type: "text", label: "Heading", max: 60 },
      {
        key: "items",
        type: "list",
        label: "Quotes",
        itemLabelKey: "author",
        maxItems: 6,
        fields: [
          { key: "quote", type: "textarea", label: "Quote", max: 240, required: true },
          { key: "author", type: "text", label: "Name", max: 40, required: true },
          { key: "location", type: "text", label: "City", max: 40 },
          { key: "rating", type: "number", label: "Rating", min: 1, max: 5 },
        ],
      },
    ],
  },
  newsletter: {
    type: "newsletter",
    label: "Newsletter",
    description: "Collect email addresses for offers and new arrivals.",
    fields: [
      { key: "heading", type: "text", label: "Heading", max: 60, required: true },
      { key: "body", type: "textarea", label: "Supporting text", max: 160 },
      { key: "placeholder", type: "text", label: "Field placeholder", max: 40 },
      { key: "buttonLabel", type: "text", label: "Button label", max: 20 },
      { key: "note", type: "text", label: "Small print", max: 80 },
    ],
  },
  rich_text: {
    type: "rich_text",
    label: "Text block",
    description: "A heading and a paragraph, for anything the other sections don't cover.",
    fields: [
      { key: "heading", type: "text", label: "Heading", max: 70 },
      { key: "body", type: "textarea", label: "Body", max: 600 },
      { key: "align", type: "select", label: "Alignment", choices: [{ value: "left", label: "Left" }, { value: "center", label: "Centred" }] },
    ],
  },
};

const CONTENT_SECTIONS = ["hero", "shop_hero", "featured_categories", "product_showcase", "promo_banner", "brand_intro", "testimonials", "newsletter", "rich_text"];

export const ECOMMERCE_TEMPLATE: TemplateManifest = {
  id: "aurelia_commerce",
  slug: "aurelia_commerce",
  name: "Aurelia Commerce",
  version: "1.0.0",
  category: "ecommerce",
  tagline: "A complete online store, from the first banner to the delivered order.",
  description:
    "Aurelia is a full e-commerce storefront: a landing page you arrange section by section, a shop with search, filters and sorting, product pages with variants and reviews, a working cart, a checkout with cash on delivery, and order tracking. Change the words, the pictures and the colours — the shopping itself already works.",
  features: [
    "Landing page with editable sections",
    "Search, filters and sorting",
    "Product variants and stock",
    "Cart and checkout",
    "Cash on delivery and UPI",
    "Order confirmation and tracking",
    "Customer reviews",
    "Responsive on every screen",
  ],
  thumbnail: "/images/templates/aurelia_commerce.webp",
  sections: SECTIONS,
  pages: [
    {
      key: "landing",
      path: "/",
      label: "Landing page",
      description: "The home page. Arrange its sections freely.",
      kind: "content",
      required: true,
      requiredReason: "Every website needs a home page: it is what a visitor sees first.",
      allows: CONTENT_SECTIONS,
    },
    {
      key: "shop",
      path: "/shop",
      label: "Shop home",
      description: "A second landing page for browsing, between the home page and the full catalogue.",
      kind: "content",
      allows: CONTENT_SECTIONS,
    },
    {
      key: "products",
      path: "/products",
      label: "Product listing",
      description: "The full catalogue with search, category filters, price filter and sorting.",
      kind: "system",
      required: true,
      requiredReason: "Without a listing page, shoppers cannot browse or find products.",
      fields: [
        { key: "heading", type: "text", label: "Page heading", max: 60, required: true },
        { key: "intro", type: "text", label: "Intro line", max: 140 },
        { key: "showSearch", type: "boolean", label: "Show search" },
        { key: "showFilters", type: "boolean", label: "Show category and price filters" },
        { key: "perPage", type: "number", label: "Products per page", min: 4, max: 12 },
      ],
    },
    {
      key: "product",
      path: "/products/:slug",
      label: "Product details",
      description: "Gallery, variants, stock, description, specifications and related products.",
      kind: "system",
      required: true,
      requiredReason: "This is where a shopper decides to buy. Nothing can be sold without it.",
      fields: [
        { key: "addToCartLabel", type: "text", label: "Add to cart label", max: 24, required: true },
        { key: "showSpecs", type: "boolean", label: "Show specifications" },
        { key: "showReviews", type: "boolean", label: "Show review summary" },
        { key: "relatedHeading", type: "text", label: "Related products heading", max: 60 },
      ],
    },
    {
      key: "cart",
      path: "/cart",
      label: "Cart",
      description: "Quantities, removal, subtotal, shipping estimate and the way to checkout.",
      kind: "system",
      required: true,
      requiredReason: "The cart is the step between browsing and paying.",
      fields: [
        { key: "heading", type: "text", label: "Page heading", max: 40, required: true },
        { key: "emptyMessage", type: "text", label: "Empty cart message", max: 120 },
        { key: "checkoutLabel", type: "text", label: "Checkout button", max: 24, required: true },
        { key: "freeShippingOver", type: "number", label: "Free shipping above (₹)", min: 0, max: 100000, help: "Used for the cart estimate until a delivery method is switched on for this website." },
        { key: "shippingFee", type: "number", label: "Shipping fee (₹)", min: 0, max: 5000, help: "The fallback rate, for the same case." },
      ],
    },
    {
      key: "checkout",
      path: "/checkout",
      label: "Checkout",
      description: "Contact details, address, shipping method, payment method and order summary.",
      kind: "system",
      required: true,
      requiredReason: "Orders cannot be placed without checkout.",
      fields: [
        { key: "heading", type: "text", label: "Page heading", max: 40, required: true },
        { key: "placeOrderLabel", type: "text", label: "Place order button", max: 24, required: true },
        { key: "note", type: "text", label: "Reassurance line", max: 120 },
      ],
    },
    {
      key: "order",
      path: "/orders/:orderNumber",
      label: "Order confirmation",
      description: "The thank-you page with the order number, items and delivery estimate.",
      kind: "system",
      required: true,
      requiredReason: "A shopper who pays must be told the order went through.",
      fields: [
        { key: "heading", type: "text", label: "Heading", max: 60, required: true },
        { key: "message", type: "textarea", label: "Message", max: 200 },
      ],
    },
    {
      key: "payment",
      path: "/pay/:orderNumber",
      label: "Payment",
      description: "Where the shopper pays for an order before it is confirmed.",
      kind: "system",
      required: true,
      requiredReason: "Every payment method except cash on delivery needs a page to pay on.",
      fields: [
        { key: "heading", type: "text", label: "Page heading", max: 40, required: true },
        { key: "note", type: "text", label: "Reassurance line", max: 120 },
      ],
    },
    {
      key: "login",
      path: "/account/login",
      label: "Sign in",
      description: "Where returning shoppers sign in.",
      kind: "system",
      governedBy: "signIn",
      fields: [
        { key: "heading", type: "text", label: "Page heading", max: 40, required: true },
        { key: "intro", type: "text", label: "Intro line", max: 140 },
        { key: "submitLabel", type: "text", label: "Button label", max: 24, required: true },
      ],
    },
    {
      key: "register",
      path: "/account/register",
      label: "Create account",
      description: "Where a new shopper opens an account.",
      kind: "system",
      governedBy: "signIn",
      fields: [
        { key: "heading", type: "text", label: "Page heading", max: 40, required: true },
        { key: "intro", type: "text", label: "Intro line", max: 140 },
        { key: "submitLabel", type: "text", label: "Button label", max: 24, required: true },
      ],
    },
    {
      key: "account",
      path: "/account",
      label: "Customer account",
      description: "A shopper's own page: their details and every order they have placed.",
      kind: "system",
      governedBy: "signIn",
      fields: [
        { key: "heading", type: "text", label: "Page heading", max: 40, required: true },
        { key: "ordersHeading", type: "text", label: "Orders heading", max: 40 },
        { key: "emptyMessage", type: "text", label: "No orders yet message", max: 140 },
      ],
    },
    {
      key: "track",
      path: "/track-order",
      label: "Track order",
      description: "Order lookup with a delivery timeline. Optional.",
      kind: "system",
      fields: [
        { key: "heading", type: "text", label: "Page heading", max: 40, required: true },
        { key: "intro", type: "text", label: "Intro line", max: 160 },
      ],
    },
    {
      key: "reviews",
      path: "/products/:slug/reviews",
      label: "Product reviews",
      description: "Full review list with ratings and a form to add one. Optional.",
      kind: "system",
      fields: [
        { key: "heading", type: "text", label: "Page heading", max: 40, required: true },
        { key: "writeLabel", type: "text", label: "Write review button", max: 24, required: true },
      ],
    },
  ],
  themeFields: [
    { key: "brandName", type: "text", label: "Brand name", max: 40, required: true, help: "Used as the wordmark when no logo is uploaded." },
    { key: "logo", type: "image", label: "Logo" },
    { key: "primary", type: "color", label: "Primary colour", help: "Buttons, links and highlights." },
    { key: "secondary", type: "color", label: "Secondary colour", help: "Badges, offers and small accents." },
    { key: "fontPair", type: "select", label: "Typography", choices: [{ value: "serif", label: "Serif headings" }, { value: "sans", label: "Sans headings" }] },
    { key: "brandDescription", type: "textarea", label: "Brand description", max: 200 },
  ],
  defaultTheme: {
    brandName: "Aurelia",
    brandDescription: "Everyday pieces made well, in small batches, for people who keep things a long time.",
    logo: null,
    primary: "#17352f",
    secondary: "#c08a4e",
    fontPair: "serif",
  },
};

export const SECTION_DEFS = SECTIONS;
