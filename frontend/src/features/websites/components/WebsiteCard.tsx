import { ArrowUpRight, ExternalLink, Globe, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { TemplateShot } from "@/components/platform/TemplateShot";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { TYPE_LABEL } from "../constants";
import type { Website } from "../types";
import { StatusBadge } from "./StatusBadge";

export function WebsiteCard({
  website,
  onEdit,
  onDelete,
  onOpenAdmin,
  deleting,
}: {
  website: Website;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenAdmin: (website: Website) => void;
  deleting?: boolean;
}) {
  const draft = website.status === "draft";
  const host = website.customDomain ?? website.url.replace("https://", "");
  const meta = website.lastPublishedAt ? `Last published ${formatDate(website.lastPublishedAt)}` : `Created ${formatDate(website.createdAt)}`;

  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-line-strong", deleting && "opacity-50")}>
      <div className="border-b border-line bg-subtle">
        <TemplateShot theme={website.thumbnailTheme} muted={draft} alt={`${website.name} homepage`} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading min-w-0 truncate text-base font-semibold text-ink">{website.name}</h3>
          <StatusBadge status={website.status} />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Globe className={cn("size-4 shrink-0", draft ? "text-faint" : "text-muted")} aria-hidden />
          {draft ? (
            <span className="truncate text-muted">
              {host} <span className="text-xs">· Not published yet</span>
            </span>
          ) : (
            <a href={`https://${host}`} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 font-medium text-primary hover:underline">
              <span className="truncate">{host}</span>
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            </a>
          )}
        </div>
        <p className="text-xs text-muted">
          {TYPE_LABEL[website.type]} · {meta}
        </p>
      </div>
      <div className="flex items-center justify-between border-t border-line px-5 py-3">
        <Button variant="secondary" size="sm" rightIcon={<ArrowUpRight className="size-4" />} onClick={() => onOpenAdmin(website)}>
          Open admin
        </Button>
        <div className="flex items-center gap-1">
          <IconButton label={`Edit ${website.name}`} onClick={() => onEdit(website.id)} disabled={deleting}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton label={`Delete ${website.name}`} danger onClick={() => onDelete(website.id)} disabled={deleting}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
      {deleting && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-7 animate-spin text-ink" aria-label="Deleting" />
        </div>
      )}
    </article>
  );
}

export function WebsiteCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface" aria-hidden>
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-[22px] w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex justify-between border-t border-line px-5 py-3">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}
