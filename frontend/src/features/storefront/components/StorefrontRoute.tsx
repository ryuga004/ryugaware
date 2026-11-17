"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useGetStorefrontQuery } from "../api";
import { Storefront } from "./Storefront";

/** Mounts the renderer on the public route and maps storefront paths onto real URLs. */
export function StorefrontRoute({ site, path }: { site: string; path: string }) {
  const router = useRouter();
  const { data, isLoading, isError } = useGetStorefrontQuery(site);

  const hrefFor = useCallback((target: string) => `/sites/${site}${target === "/" ? "" : target}`, [site]);
  const go = useCallback((target: string) => router.push(hrefFor(target)), [router, hrefFor]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sf-paper" role="status" aria-label="Loading store">
        <Loader2 className="size-6 animate-spin text-sf-faint" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-sf-paper px-6 text-center">
        <p className="font-sf-display text-2xl text-sf-ink">No store at this address</p>
        <p className="mt-3 max-w-sm text-sm text-sf-muted">
          There is no website with the address <span className="font-medium text-sf-ink">{site}</span> in this demo.
        </p>
      </div>
    );
  }

  return <Storefront site={data.content} commerce={data.commerce} path={path} hrefFor={hrefFor} onNavigate={go} />;
}
