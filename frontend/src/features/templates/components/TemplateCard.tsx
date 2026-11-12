import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { TemplateShot } from "@/components/platform/TemplateShot";
import type { Template } from "../types";

export function TemplateCard({
  template,
  onPreview,
  onUse,
  useDisabledReason,
}: {
  template: Template;
  onPreview: (id: string) => void;
  onUse: (id: string) => void;
  /** When set, "Use template" is disabled and the reason is shown as a tooltip. */
  useDisabledReason?: string;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-line-strong">
      <div className="border-b border-line bg-subtle">
        <TemplateShot theme={template.thumbnailTheme} alt={`${template.name} template homepage`} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-base font-semibold text-ink">{template.name}</h3>
          <Badge className="capitalize">{template.category}</Badge>
        </div>
        <p className="line-clamp-2 text-sm text-muted">{template.description}</p>
        <p className="mt-auto pt-2 text-xs text-muted">
          {template.pages} pages · {template.features.slice(0, 3).join(", ")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-line px-5 py-3">
        <Button variant="secondary" size="sm" rightIcon={<ExternalLink className="size-3.5" />} onClick={() => onPreview(template.id)}>
          Preview
        </Button>
        <Button size="sm" onClick={() => onUse(template.id)} disabled={Boolean(useDisabledReason)} title={useDisabledReason}>
          Use template
        </Button>
      </div>
    </article>
  );
}

export function TemplateCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface" aria-hidden>
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-[22px] w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-line px-5 py-3">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    </div>
  );
}
