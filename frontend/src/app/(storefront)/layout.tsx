import type { Metadata } from "next";

/**
 * Public storefront shell. Customer websites are served here, outside the signed-in app: no
 * AppShell, no auth gate, and none of the platform design — a storefront looks like its template.
 */
export const metadata: Metadata = {
  title: { default: "Store", template: "%s" },
  robots: { index: false },
};

/** A storefront waits on its website's content, so navigations into it are not instant. */
export const instant = false;

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-sf-paper">{children}</div>;
}
