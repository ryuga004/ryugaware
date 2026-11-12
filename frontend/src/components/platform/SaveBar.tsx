"use client";

import { useEffect } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Sticky "unsaved changes" bar for single-form pages (Settings, Storage, Authentication, Contact).
 * Sits above the mobile tab bar and beside the sidebar; warns before the tab is closed with edits.
 */
export function SaveBar({
  dirty,
  saving,
  canSave = true,
  onReset,
  onSave,
  saveLabel = "Save changes",
  formId,
}: {
  dirty: boolean;
  saving?: boolean;
  canSave?: boolean;
  onReset: () => void;
  /** Click handler; omit when `formId` submits a form instead. */
  onSave?: () => void;
  saveLabel?: string;
  /** Submit this form id instead of calling onSave. */
  formId?: string;
}) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (!dirty) return null;
  return (
    <div className="fixed inset-x-0 bottom-16 z-20 border-t border-line bg-surface shadow-pop md:bottom-0 md:left-16 lg:left-60">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6 lg:px-8">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Info className="size-5 text-warning" aria-hidden /> You have unsaved changes
        </p>
        <div className="flex gap-3 max-sm:[&>button]:flex-1">
          <Button variant="ghost" onClick={onReset} disabled={saving}>
            Reset
          </Button>
          <Button type={formId ? "submit" : "button"} form={formId} onClick={onSave} loading={saving} disabled={!canSave}>
            {saving ? "Saving…" : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
