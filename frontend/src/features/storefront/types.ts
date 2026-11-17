/**
 * Storefront model: the platform-owned template definition, and the customer-owned website instance
 * created from it.
 *
 * The rule the whole feature rests on (see `docs/ARCHITECTURE.md`): a template is code + schema +
 * default content that we own and never mutate; a website instance is a deep copy of that default
 * content that the customer owns and edits. Two websites made from one template share nothing but
 * the React components that render them.
 */

/* ------------------------------------------------------------------ *
 * Template definition — platform owned, read only
 * ------------------------------------------------------------------ */

/** The field types a section can declare. The editor renders one control per type. */
export type FieldType = "text" | "textarea" | "image" | "link" | "boolean" | "select" | "number" | "color" | "list";

export interface SelectChoice {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  type: FieldType;
  label: string;
  /** Shown under the control in the editor. */
  help?: string;
  placeholder?: string;
  /** Character limit for text, or numeric bounds for number. */
  max?: number;
  min?: number;
  required?: boolean;
  /** `select` only. */
  choices?: SelectChoice[];
  /** `list` only: the fields of one item, and how many items are allowed. */
  fields?: FieldDef[];
  itemLabelKey?: string;
  maxItems?: number;
}

export interface SectionDef {
  type: string;
  label: string;
  description: string;
  /** Site chrome: present on every page, cannot be removed, reordered or disabled. */
  fixed?: boolean;
  fields: FieldDef[];
}

/**
 * `content` pages are a list of sections the customer arranges.
 * `system` pages are functional routes owned by the template (listing, product, cart, checkout…);
 * the customer edits a few labels on them, not their layout.
 */
export type PageKind = "content" | "system";

export interface PageDef {
  key: string;
  /** Route inside the storefront; `:slug` style segments are filled at render time. */
  path: string;
  label: string;
  description: string;
  kind: PageKind;
  /** Required pages cannot be switched off. */
  required?: boolean;
  /** Why it is required, or what stops working without it. Shown in the wizard. */
  requiredReason?: string;
  /** This page exists only while the setting it names is switched on, so it has no toggle of its own. */
  governedBy?: "signIn";
  /** Section types allowed on a content page. */
  allows?: string[];
  /** Editable labels on a system page. */
  fields?: FieldDef[];
}

export interface TemplateManifest {
  id: string;
  slug: string;
  name: string;
  version: string;
  category: "ecommerce" | "services";
  tagline: string;
  description: string;
  features: string[];
  /** Thumbnail under public/images/templates. */
  thumbnail: string;
  pages: PageDef[];
  sections: Record<string, SectionDef>;
  themeFields: FieldDef[];
  defaultTheme: SiteTheme;
}

/* ------------------------------------------------------------------ *
 * Website instance — customer owned, editable
 * ------------------------------------------------------------------ */

export type FontPair = "serif" | "sans";

export interface SiteTheme {
  brandName: string;
  brandDescription: string;
  /** Data URL from the branding step; null means the brand name is used as a wordmark. */
  logo: string | null;
  primary: string;
  secondary: string;
  fontPair: FontPair;
}

export interface SiteSection {
  id: string;
  type: string;
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface SitePage {
  id: string;
  key: string;
  path: string;
  title: string;
  kind: PageKind;
  /** Optional pages can be switched off; required ones are always true. */
  enabled: boolean;
  /** Mirrors the template's `governedBy`: the page follows a store setting, not its own switch. */
  governedBy?: "signIn";
  seo: { title: string; description: string };
  /** Content pages only. */
  sections: SiteSection[];
  /** System pages only: values for the page's declared fields. */
  settings: Record<string, unknown>;
}

export interface SiteContent {
  websiteId: string;
  templateId: string;
  templateVersion: string;
  theme: SiteTheme;
  /** Fixed sections shared by every page: announcement bar, header, footer. Edited once. */
  chrome: SiteSection[];
  pages: SitePage[];
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Catalogue — template demo data, shared by every instance
 * ------------------------------------------------------------------ */

export interface ProductVariant {
  id: string;
  label: string;
  inStock: boolean;
}

export type ProductTag = "new" | "bestseller" | "sale";

export interface Product {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  images: string[];
  summary: string;
  description: string;
  specs: { label: string; value: string }[];
  variantLabel: string;
  variants: ProductVariant[];
  stock: number;
  rating: number;
  reviewCount: number;
  tags: ProductTag[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  image: string;
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  date: string;
  rating: number;
  title: string;
  body: string;
}

/* ------------------------------------------------------------------ *
 * Shopper state — cart and orders, per website, in the browser
 * ------------------------------------------------------------------ */

export interface CartLine {
  productId: string;
  variantId: string;
  qty: number;
}

export interface OrderLine extends CartLine {
  name: string;
  variantLabel: string;
  image: string;
  price: number;
}

export type OrderStage = "placed" | "confirmed" | "processing" | "shipped" | "delivered";

/** `cod` is money owed to the courier; everything else is settled before the order is confirmed. */
export type PaymentStatus = "pending" | "paid" | "failed" | "cod";

export interface OrderEvent {
  stage: OrderStage;
  at: string;
  note: string;
}

/**
 * A shopper's account on one website. Demo only: it lives in this browser, and no password ever
 * leaves it. A real build authenticates against the backend using the website's sign-in settings.
 */
export interface ShopperAccount {
  name: string;
  email: string;
  phone: string;
  password: string;
  createdAt: string;
}

export interface Order {
  number: string;
  placedAt: string;
  customer: { name: string; email: string; phone: string };
  address: { line1: string; line2: string; city: string; state: string; pincode: string };
  lines: OrderLine[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentType: CheckoutPaymentKind;
  shippingMethod: string;
  stage: OrderStage;
  paymentStatus: PaymentStatus;
  /** What has happened to the order so far, newest last. */
  events: OrderEvent[];
  estimatedDelivery: string;
}

/** What the delivery read returns: the website a host resolves to, plus its content. */
export interface StorefrontResponse {
  websiteId: string;
  name: string;
  subdomain: string;
  status: "live" | "draft" | "paused";
  /** True for the template's own demo content, which belongs to no website. */
  preview: boolean;
  content: SiteContent;
  /** Payment, delivery and sign-in options this website offers. */
  commerce: StoreCommerce;
}

/* ------------------------------------------------------------------ *
 * Commerce — what this website offers a shopper, resolved per website
 * ------------------------------------------------------------------ */

/**
 * The shopper-facing view of the organisation's payment, delivery and sign-in options, narrowed to
 * the ones this website offers. Keys, fees and provider credentials never reach the storefront.
 */
export type CheckoutPaymentKind = "cod" | "upi" | "card" | "netbanking" | "wallet";

export interface CheckoutPaymentOption {
  id: string;
  kind: CheckoutPaymentKind;
  label: string;
  hint: string;
  /** Category mark under /images/marks. */
  mark: string;
  /** Cash on delivery charges a flat fee and can have order limits. */
  fee: number;
  minOrder: number | null;
  maxOrder: number | null;
  testMode: boolean;
}

export interface CheckoutDeliveryOption {
  id: string;
  name: string;
  carrier: string;
  daysLabel: string;
  /** Upper bound of the lead time, used for the delivery estimate on the order. */
  maxDays: number;
  rateType: "flat" | "free" | "free_above";
  price: number;
  freeAbove: number | null;
  mark: string;
}

export interface StoreCommerce {
  payments: CheckoutPaymentOption[];
  delivery: CheckoutDeliveryOption[];
  signIn: { email: boolean; google: boolean };
}
