import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { StorefrontRoute } from "@/features/storefront/components/StorefrontRoute";

/**
 * Every published website, on one route.
 *
 * `site` stands in for the Host header a real deployment would resolve (see docs/ARCHITECTURE.md):
 * it is the website's subdomain, or "preview" for the template's own demo content. The rest of the
 * URL is the path inside that storefront.
 *
 * With `cacheComponents`, reading the params is runtime work, so it sits behind a Suspense boundary
 * and the shell around it stays static.
 */
export default function StorefrontPage({ params }: { params: Promise<{ site: string; path?: string[] }> }) {
  return (
    <Suspense fallback={<StorefrontLoading />}>
      <ResolveStorefront params={params} />
    </Suspense>
  );
}

async function ResolveStorefront({ params }: { params: Promise<{ site: string; path?: string[] }> }) {
  const { site, path } = await params;
  return <StorefrontRoute site={site} path={`/${(path ?? []).join("/")}`} />;
}

function StorefrontLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-sf-paper" role="status" aria-label="Loading store">
      <Loader2 className="size-6 animate-spin text-sf-faint" />
    </div>
  );
}
