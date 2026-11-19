import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { TemplatePreviewRoute } from "@/features/storefront/components/TemplatePreviewRoute";

/**
 * Template preview, served entirely from the frontend.
 *
 * `template` is the template's slug — the same id the catalogue API returns and the same
 * `manifest.id` in `features/storefront/templates`. Nothing here calls the backend: the template
 * and its demo content are platform-owned code, so the preview is pure rendering. The rest of the
 * URL is the path inside the previewed storefront.
 */
export default function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ template: string; path?: string[] }>;
}) {
  return (
    <Suspense fallback={<PreviewLoading />}>
      <ResolvePreview params={params} />
    </Suspense>
  );
}

async function ResolvePreview({ params }: { params: Promise<{ template: string; path?: string[] }> }) {
  const { template, path } = await params;
  return <TemplatePreviewRoute template={template} path={`/${(path ?? []).join("/")}`} />;
}

function PreviewLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-sf-paper" role="status" aria-label="Loading preview">
      <Loader2 className="size-6 animate-spin text-sf-faint" />
    </div>
  );
}
