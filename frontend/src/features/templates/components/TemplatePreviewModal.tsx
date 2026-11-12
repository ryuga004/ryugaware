"use client";

import { Check, ExternalLink } from "lucide-react";
import { Modal } from "@/components/platform/Modal";
import { TemplateShot } from "@/components/platform/TemplateShot";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { selectLimitReached } from "@/features/account/slice";
import { openCreateDrawer } from "@/features/websites/slice";
import { formatDate } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetTemplateQuery } from "../api";
import { closeTemplatePreview, selectPreviewId } from "../slice";

export function TemplatePreviewModal() {
  const dispatch = useAppDispatch();
  const id = useAppSelector(selectPreviewId);
  const limitReached = useAppSelector(selectLimitReached);
  const { data: t } = useGetTemplateQuery(id ?? "", { skip: !id });

  const close = () => dispatch(closeTemplatePreview());

  return (
    <Modal
      open={Boolean(id && t)}
      onClose={close}
      size="lg"
      title={t?.name ?? "Template"}
      description={t?.description}
      footer={
        t && (
          <>
            <a href={t.previewUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-surface px-3.5 text-sm font-medium hover:bg-subtle">
              Open live preview <ExternalLink className="size-4" aria-hidden />
            </a>
            <Button
              disabled={limitReached}
              onClick={() => {
                close();
                dispatch(openCreateDrawer({ templateId: t.id }));
              }}
            >
              Use template
            </Button>
          </>
        )
      }
    >
      {t && (
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-card border border-line bg-subtle">
            <TemplateShot theme={t.thumbnailTheme} alt={`${t.name} template homepage`} sizes="(min-width: 768px) 720px, 100vw" />
          </div>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted">INCLUDES</p>
              <ul className="mt-2 space-y-1.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-success" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted">PAYMENTS</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.paymentMethods.map((p) => (
                  <Badge key={p}>{p}</Badge>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted">
              {t.pages} pages · v{t.version} · Updated {formatDate(t.updatedAt)}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
