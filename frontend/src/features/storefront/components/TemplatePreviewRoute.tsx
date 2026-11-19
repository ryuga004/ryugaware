"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { previewSite } from "../instantiate";
import { getTemplate } from "../templates";
import { Storefront } from "./Storefront";

/**
 * A whole template, rendered from its manifest alone.
 *
 * Templates are platform-owned and live in code, so a preview needs no website and no API call:
 * it instantiates the template's own demo content and hands it to the same renderer a real
 * storefront uses. The backend's part begins when a website is created from the template.
 */
export function TemplatePreviewRoute({ template, path }: { template: string; path: string }) {
  const router = useRouter();
  const bundle = getTemplate(template);

  const hrefFor = useCallback(
    (target: string) => `/preview/${template}${target === "/" ? "" : target}`,
    [template],
  );
  const go = useCallback((target: string) => router.push(hrefFor(target)), [router, hrefFor]);

  // Fixed so the server render and the client render agree; a preview has no real clock.
  const site = useMemo(() => (bundle ? previewSite(template, PREVIEW_NOW) : null), [bundle, template]);

  if (!site) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-sf-paper px-6 text-center">
        <p className="font-sf-display text-2xl text-sf-ink">No template at this address</p>
        <p className="mt-3 max-w-sm text-sm text-sf-muted">
          There is no template called <span className="font-medium text-sf-ink">{template}</span>.
        </p>
      </div>
    );
  }

  return <Storefront site={site} path={path} hrefFor={hrefFor} onNavigate={go} preview />;
}

const PREVIEW_NOW = "2026-01-01T00:00:00.000Z";
