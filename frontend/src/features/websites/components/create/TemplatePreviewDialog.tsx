"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useGetStorefrontQuery } from "@/features/storefront/api";
import { DeviceFrame, DeviceSwitcher, type Device } from "@/features/storefront/components/DeviceFrame";
import { Storefront } from "@/features/storefront/components/Storefront";
import type { TemplateManifest } from "@/features/storefront/types";
import { pluralize } from "@/lib/format";

/**
 * Full-screen template preview: the real template, running on its own demo content, clickable at
 * three widths. Nothing here is a screenshot — it is the same renderer a published website uses.
 */
export function TemplatePreviewDialog({
  template,
  open,
  onClose,
  onUse,
}: {
  template: TemplateManifest | null;
  open: boolean;
  onClose: () => void;
  onUse: (template: TemplateManifest) => void;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [path, setPath] = useState("/");
  const { data, isLoading } = useGetStorefrontQuery("preview", { skip: !open });

  if (!template) return null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setPath("/");
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="animate-fade-in fixed inset-0 z-50 flex flex-col bg-page focus:outline-none sm:inset-4 sm:rounded-sheet sm:shadow-drawer">
          <header className="flex shrink-0 items-center gap-4 border-b border-line bg-surface px-4 py-3 sm:rounded-t-sheet sm:px-6">
            <div className="min-w-0">
              <Dialog.Title className="font-heading truncate text-lg font-semibold">{template.name}</Dialog.Title>
              <Dialog.Description className="truncate text-xs text-muted">{template.tagline}</Dialog.Description>
            </div>
            <DeviceSwitcher value={device} onChange={setDevice} className="ml-auto max-md:hidden" />
            <Button onClick={() => onUse(template)} className="max-sm:hidden">
              Use this template
            </Button>
            <Dialog.Close asChild>
              <IconButton label="Close preview">
                <X className="size-5" />
              </IconButton>
            </Dialog.Close>
          </header>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <aside className="shrink-0 overflow-y-auto border-line bg-surface p-5 max-lg:border-b lg:w-[300px] lg:border-r">
              <p className="text-sm leading-relaxed text-body">{template.description}</p>

              <h3 className="mt-6 text-xs font-medium tracking-wide text-muted uppercase">Pages ({template.pages.length})</h3>
              <ul className="mt-3 space-y-2">
                {template.pages.map((p) => (
                  <li key={p.key}>
                    <button
                      type="button"
                      onClick={() => setPath(p.path.replace(":slug", "ecru-heavyweight-tee").replace(":orderNumber", "AUR-DEMO01"))}
                      className="w-full rounded-md px-2 py-1.5 text-left text-sm text-ink transition-colors hover:bg-subtle"
                    >
                      {p.label}
                      {p.required && <span className="ml-2 text-xs text-muted">Required</span>}
                    </button>
                  </li>
                ))}
              </ul>

              <h3 className="mt-6 text-xs font-medium tracking-wide text-muted uppercase">Sections</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.values(template.sections).map((s) => (
                  <Badge key={s.type} tone="neutral">
                    {s.label}
                  </Badge>
                ))}
              </div>

              <h3 className="mt-6 text-xs font-medium tracking-wide text-muted uppercase">Includes</h3>
              <ul className="mt-3 space-y-1.5">
                {template.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-body">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-muted">{pluralize(template.pages.length, "page")} · version {template.version}</p>
            </aside>

            <div className="min-h-0 flex-1">
              {isLoading || !data ? (
                <div className="h-full space-y-4 p-6">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : (
                <DeviceFrame device={device}>
                  <Storefront site={data.content} path={path} onNavigate={setPath} hrefFor={() => "#"} preview />
                </DeviceFrame>
              )}
            </div>
          </div>

          <footer className="shrink-0 border-t border-line bg-surface px-4 py-3 sm:hidden">
            <Button fullWidth onClick={() => onUse(template)}>
              Use this template
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
