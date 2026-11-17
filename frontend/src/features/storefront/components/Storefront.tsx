"use client";

/**
 * The multi-tenant renderer: one component that draws any website made from any template.
 *
 * It takes the website's saved content and a storefront path, and renders the matching page.
 * Nothing here knows which website it is drawing — which is the whole point: the same code serves
 * every customer, and the per-website part is entirely data (see docs/ARCHITECTURE.md).
 *
 * It is mounted three ways: the public route (`/sites/<subdomain>`), the template preview, and the
 * live preview inside the editor. Only `onNavigate` / `hrefFor` differ between them.
 */
import { cn } from "@/lib/cn";
import type { SiteContent, SitePage, StoreCommerce } from "../types";
import { ShopProvider, useShop } from "./ShopContext";
import { SECTION_COMPONENTS } from "./sections/registry";
import { Container, SfButtonLink } from "./ui";
import { ProductDetailPage, ProductListingPage, ReviewsPage } from "./pages/catalog";
import { CartPage, CheckoutPage, OrderPage, TrackOrderPage } from "./pages/checkout";
import { AccountPage, LoginPage, RegisterPage } from "./pages/account";
import { PaymentPage } from "./pages/payment";

export function Storefront({
  site,
  commerce,
  path,
  onNavigate,
  hrefFor,
  preview,
  className,
}: {
  site: SiteContent;
  /** Payment, delivery and sign-in options, chosen per website in the editor. */
  commerce?: StoreCommerce;
  path: string;
  onNavigate: (path: string) => void;
  hrefFor: (path: string) => string;
  preview?: boolean;
  className?: string;
}) {
  const { theme } = site;
  const display = theme.fontPair === "sans" ? "var(--font-inter)" : "var(--font-playfair)";

  return (
    <ShopProvider site={site} commerce={commerce} path={path} onNavigate={onNavigate} hrefFor={hrefFor} preview={preview}>
      <div
        className={cn("font-sf-body flex min-h-full flex-col bg-sf-paper text-sf-body antialiased", className)}
        style={
          {
            // Per-website branding: the only thing that differs between two sites on one template.
            "--color-sf-primary": theme.primary,
            "--color-sf-secondary": theme.secondary,
            "--font-sf-display": display,
          } as React.CSSProperties
        }
      >
        <Chrome slot="top" />
        <main className="flex-1">
          <PageBody />
        </main>
        <Chrome slot="bottom" />
      </div>
    </ShopProvider>
  );
}

function Chrome({ slot }: { slot: "top" | "bottom" }) {
  const { site } = useShop();
  const wanted = slot === "top" ? ["announcement_bar", "header"] : ["footer"];
  return (
    <>
      {site.chrome
        .filter((section) => section.enabled && wanted.includes(section.type))
        .sort((a, b) => wanted.indexOf(a.type) - wanted.indexOf(b.type))
        .map((section) => {
          const Component = SECTION_COMPONENTS[section.type];
          return Component ? <Component key={section.id} section={section} /> : null;
        })}
    </>
  );
}

function PageBody() {
  const { route, page, isEnabled } = useShop();

  if (!page || route.pageKey === "not-found") return <NotFound />;
  if (!isEnabled(page.path)) return <PageOff page={page} enabled={page.enabled} />;

  if (page.kind === "content") {
    return (
      <>
        {page.sections
          .filter((section) => section.enabled)
          .map((section) => {
            const Component = SECTION_COMPONENTS[section.type];
            return Component ? <Component key={section.id} section={section} /> : null;
          })}
      </>
    );
  }

  switch (page.key) {
    case "products":
      return <ProductListingPage page={page} />;
    case "product":
      // Keyed by slug so moving between products resets the gallery, variant and quantity.
      return <ProductDetailPage key={route.params.slug} page={page} slug={route.params.slug ?? ""} />;
    case "reviews":
      return <ReviewsPage key={route.params.slug} page={page} slug={route.params.slug ?? ""} />;
    case "cart":
      return <CartPage page={page} />;
    case "checkout":
      return <CheckoutPage page={page} />;
    case "order":
      return <OrderPage page={page} orderNumber={route.params.orderNumber ?? ""} />;
    case "track":
      return <TrackOrderPage page={page} />;
    case "payment":
      return <PaymentPage page={page} orderNumber={route.params.orderNumber ?? ""} />;
    case "login":
      return <LoginPage page={page} />;
    case "register":
      return <RegisterPage page={page} />;
    case "account":
      return <AccountPage page={page} />;
    default:
      return <NotFound />;
  }
}

function NotFound() {
  return (
    <Container className="py-28 text-center">
      <p className="text-xs font-medium tracking-[0.18em] text-sf-secondary uppercase">404</p>
      <h1 className="font-sf-display mt-3 text-3xl text-sf-ink">This page doesn’t exist</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm text-sf-muted">The link may be out of date. Everything we sell is one click away.</p>
      <SfButtonLink to="/" className="mt-8">Back to the home page</SfButtonLink>
    </Container>
  );
}

function PageOff({ page, enabled }: { page: SitePage; enabled: boolean }) {
  return (
    <Container className="py-28 text-center">
      <h1 className="font-sf-display text-3xl text-sf-ink">{page.title} is switched off</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-sf-muted">
        {enabled
          ? "Customer accounts are switched off for this website. Turn them on under Store settings in the website editor."
          : "This page is part of the template but is not switched on for this website. Turn it on in the website editor."}
      </p>
      <SfButtonLink to="/" className="mt-8">Back to the home page</SfButtonLink>
    </Container>
  );
}
