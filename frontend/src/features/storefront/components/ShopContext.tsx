"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useShopperAuth, type RegisterInput } from "../account";
import { getTemplate } from "../templates";
import { useLocalJson } from "../localStore";
import type { CartLine, CheckoutDeliveryOption, Order, OrderLine, ShopperAccount, SiteContent, SitePage, StoreCommerce } from "../types";
import { productById } from "../templates/ecommerce/catalog";

/* ------------------------------ routing ------------------------------ */

export interface RouteMatch {
  pageKey: string;
  params: Record<string, string>;
}

/** Storefront path → page key. Mirrors the `path` values declared in the template manifest. */
export function matchStorefrontPath(path: string): RouteMatch {
  const clean = `/${path.replace(/^\/+|\/+$/g, "")}`;
  const seg = clean === "/" ? [] : clean.slice(1).split("/");
  if (seg.length === 0) return { pageKey: "landing", params: {} };
  if (seg[0] === "shop" && seg.length === 1) return { pageKey: "shop", params: {} };
  if (seg[0] === "cart" && seg.length === 1) return { pageKey: "cart", params: {} };
  if (seg[0] === "checkout" && seg.length === 1) return { pageKey: "checkout", params: {} };
  if (seg[0] === "track-order" && seg.length === 1) return { pageKey: "track", params: {} };
  if (seg[0] === "pay" && seg.length === 2) return { pageKey: "payment", params: { orderNumber: seg[1] } };
  if (seg[0] === "account") {
    if (seg.length === 1) return { pageKey: "account", params: {} };
    if (seg.length === 2 && seg[1] === "login") return { pageKey: "login", params: {} };
    if (seg.length === 2 && seg[1] === "register") return { pageKey: "register", params: {} };
  }
  if (seg[0] === "orders" && seg.length === 2) return { pageKey: "order", params: { orderNumber: seg[1] } };
  if (seg[0] === "products") {
    if (seg.length === 1) return { pageKey: "products", params: {} };
    if (seg.length === 2) return { pageKey: "product", params: { slug: seg[1] } };
    if (seg.length === 3 && seg[2] === "reviews") return { pageKey: "reviews", params: { slug: seg[1] } };
  }
  return { pageKey: "not-found", params: {} };
}

/* ------------------------------ cart ------------------------------ */

interface ShopState {
  lines: CartLine[];
  orders: Order[];
}

type ShopAction =
  | { type: "add"; productId: string; variantId: string; qty: number }
  | { type: "setQty"; productId: string; variantId: string; qty: number }
  | { type: "remove"; productId: string; variantId: string }
  | { type: "clear" }
  | { type: "order"; order: Order }
  | { type: "updateOrder"; number: string; patch: Partial<Order> };

const EMPTY: ShopState = { lines: [], orders: [] };

const same = (l: CartLine, productId: string, variantId: string) => l.productId === productId && l.variantId === variantId;

function reducer(state: ShopState, action: ShopAction): ShopState {
  switch (action.type) {
    case "add": {
      const existing = state.lines.find((l) => same(l, action.productId, action.variantId));
      const lines = existing
        ? state.lines.map((l) => (same(l, action.productId, action.variantId) ? { ...l, qty: Math.min(10, l.qty + action.qty) } : l))
        : [...state.lines, { productId: action.productId, variantId: action.variantId, qty: action.qty }];
      return { ...state, lines };
    }
    case "setQty":
      return {
        ...state,
        lines: state.lines.flatMap((l) =>
          same(l, action.productId, action.variantId) ? (action.qty <= 0 ? [] : [{ ...l, qty: Math.min(10, action.qty) }]) : [l],
        ),
      };
    case "remove":
      return { ...state, lines: state.lines.filter((l) => !same(l, action.productId, action.variantId)) };
    case "clear":
      return { ...state, lines: [] };
    case "order":
      return { lines: [], orders: [action.order, ...state.orders] };
    case "updateOrder":
      return { ...state, orders: state.orders.map((o) => (o.number === action.number ? { ...o, ...action.patch } : o)) };
    default:
      return state;
  }
}

/* ------------------------------ context ------------------------------ */

export interface ShopValue {
  site: SiteContent;
  /** What this website accepts at checkout. Empty lists mean nothing is set up yet. */
  commerce: StoreCommerce;
  /** Current storefront path, e.g. "/products/ecru-heavyweight-tee". */
  path: string;
  route: RouteMatch;
  page: SitePage | undefined;
  /** Href for a storefront path, already prefixed for however the storefront is mounted. */
  href: (path: string) => string;
  go: (path: string) => void;
  /** False when the customer switched that page off in the wizard or the editor. */
  isEnabled: (path: string) => boolean;
  lines: CartLine[];
  cartCount: number;
  orders: Order[];
  addToCart: (productId: string, variantId: string, qty?: number) => void;
  setQty: (productId: string, variantId: string, qty: number) => void;
  removeLine: (productId: string, variantId: string) => void;
  clearCart: () => void;
  placeOrder: (order: Order) => void;
  updateOrder: (number: string, patch: Partial<Order>) => void;
  orderByNumber: (number: string) => Order | undefined;
  /** The signed-in shopper, when this website offers accounts. */
  customer: ShopperAccount | null;
  myOrders: Order[];
  register: (input: RegisterInput, now: string) => string | null;
  signIn: (email: string, password: string) => string | null;
  signInWithGoogle: (now: string) => void;
  signOut: () => void;
  /** Search term handed from the header to the listing page. */
  search: string;
  setSearch: (value: string) => void;
  /** True inside the editor / template preview: forms and links stay inert where they must. */
  preview: boolean;
}

const ShopCtx = createContext<ShopValue | null>(null);

export function useShop() {
  const value = useContext(ShopCtx);
  if (!value) throw new Error("useShop must be used inside <ShopProvider>");
  return value;
}

export const NO_COMMERCE: StoreCommerce = { payments: [], delivery: [], signIn: { email: false, google: false } };

export function ShopProvider({
  site,
  commerce,
  path,
  onNavigate,
  hrefFor,
  preview = false,
  children,
}: {
  site: SiteContent;
  commerce?: StoreCommerce;
  path: string;
  onNavigate: (path: string) => void;
  hrefFor: (path: string) => string;
  preview?: boolean;
  children: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  // The cart and past orders live in the visitor's browser, keyed by website: two storefronts open
  // side by side keep separate carts, exactly as two real shops would.
  const [state, setState] = useLocalJson<ShopState>(`ryugaware.shop.${site.websiteId}`, EMPTY);
  const auth = useShopperAuth(site.websiteId);
  const dispatch = useCallback((action: ShopAction) => setState(reducer(state, action)), [state, setState]);

  const route = useMemo(() => matchStorefrontPath(path), [path]);
  const page = useMemo(() => site.pages.find((p) => p.key === route.pageKey), [site.pages, route.pageKey]);

  const signInOn = Boolean(commerce?.signIn.email || commerce?.signIn.google);
  const manifest = useMemo(() => getTemplate(site.templateId)?.manifest, [site.templateId]);

  /**
   * A page is reachable when the customer kept it, and — for the account pages — while this
   * website still offers sign-in. That setting lives in the editor's Store settings.
   */
  const isEnabled = useCallback(
    (target: string) => {
      if (!target.startsWith("/")) return true;
      const key = matchStorefrontPath(target).pageKey;
      const found = site.pages.find((p) => p.key === key);
      if (!found || !found.enabled) return false;
      const def = manifest?.pages.find((p) => p.key === key);
      return def?.governedBy === "signIn" ? signInOn : true;
    },
    [site.pages, manifest, signInOn],
  );

  const value = useMemo<ShopValue>(
    () => ({
      site,
      commerce: commerce ?? NO_COMMERCE,
      path,
      route,
      page,
      href: hrefFor,
      go: onNavigate,
      isEnabled,
      lines: state.lines,
      cartCount: state.lines.reduce((n, l) => n + l.qty, 0),
      orders: state.orders,
      addToCart: (productId, variantId, qty = 1) => dispatch({ type: "add", productId, variantId, qty }),
      setQty: (productId, variantId, qty) => dispatch({ type: "setQty", productId, variantId, qty }),
      removeLine: (productId, variantId) => dispatch({ type: "remove", productId, variantId }),
      clearCart: () => dispatch({ type: "clear" }),
      placeOrder: (order) => dispatch({ type: "order", order }),
      updateOrder: (number, patch) => dispatch({ type: "updateOrder", number, patch }),
      orderByNumber: (number) => state.orders.find((o) => o.number === number),
      customer: auth.customer,
      myOrders: auth.customer ? state.orders.filter((o) => o.customer.email.toLowerCase() === auth.customer!.email) : [],
      register: auth.register,
      signIn: auth.signIn,
      signInWithGoogle: auth.signInWithGoogle,
      signOut: auth.signOut,
      search,
      setSearch,
      preview,
    }),
    [site, commerce, path, route, page, hrefFor, onNavigate, isEnabled, state, dispatch, auth, search, preview],
  );

  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}

/* ------------------------------ derived ------------------------------ */

export function cartLineDetails(lines: CartLine[]): OrderLine[] {
  return lines.flatMap((line) => {
    const product = productById(line.productId);
    if (!product) return [];
    const variant = product.variants.find((v) => v.id === line.variantId) ?? product.variants[0];
    return [{ ...line, name: product.name, variantLabel: variant?.label ?? "", image: product.image, price: product.price }];
  });
}

export function cartTotals(lines: CartLine[], opts: { freeOver: number; fee: number }) {
  const detailed = cartLineDetails(lines);
  const subtotal = detailed.reduce((sum, l) => sum + l.price * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= opts.freeOver ? 0 : opts.fee;
  return { detailed, subtotal, shipping, total: subtotal + shipping };
}

/** What a delivery option costs for this order. */
export function deliveryPrice(option: CheckoutDeliveryOption, subtotal: number) {
  if (option.rateType === "free") return 0;
  if (option.rateType === "free_above" && option.freeAbove !== null && subtotal >= option.freeAbove) return 0;
  return option.price;
}

/**
 * Shipping shown before a delivery option is chosen: the cheapest one this website offers, or the
 * cart page's own estimate when no delivery method is set up yet.
 */
export function estimatedShipping(commerce: StoreCommerce, subtotal: number, fallback: { freeOver: number; fee: number }) {
  if (subtotal === 0) return 0;
  if (commerce.delivery.length === 0) return subtotal >= fallback.freeOver ? 0 : fallback.fee;
  return Math.min(...commerce.delivery.map((option) => deliveryPrice(option, subtotal)));
}
