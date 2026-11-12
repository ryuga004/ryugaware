"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  /** When set, the confirm button stays disabled until this exact text is typed. */
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmBody({ title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "primary", loading, requireText, onConfirm, onCancel }: Omit<ConfirmDialogProps, "open">) {
  const [typed, setTyped] = useState("");
  const blocked = Boolean(requireText) && typed.trim() !== requireText;
  return (
    <Dialog.Content
      onInteractOutside={(e) => loading && e.preventDefault()}
      className={cn("animate-pop-in fixed top-1/2 left-1/2 z-[70] w-[calc(100vw-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-sheet bg-surface p-6 shadow-drawer focus:outline-none")}
    >
      {tone === "danger" && (
        <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-danger-bg text-danger">
          <TriangleAlert className="size-5" aria-hidden />
        </div>
      )}
      <Dialog.Title className="font-heading text-xl font-semibold text-ink">{title}</Dialog.Title>
      {description ? (
        <Dialog.Description className="mt-2 text-sm text-body">{description}</Dialog.Description>
      ) : (
        <Dialog.Description className="sr-only">{title}</Dialog.Description>
      )}
      {requireText && (
        <div className="mt-5">
          <label htmlFor="confirm-text" className="mb-1.5 block text-sm font-medium">
            Type <strong>{requireText}</strong> to confirm
          </label>
          <Input id="confirm-text" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
        </div>
      )}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={blocked} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog.Content>
  );
}

/** Confirmation modal for destructive or irreversible actions (delete, discard). */
export function ConfirmDialog({ open, onCancel, ...rest }: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && !rest.loading && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-[65] bg-ink/40" />
        {/* Body mounts only while open, so the typed text resets every time. */}
        <ConfirmBody {...rest} onCancel={onCancel} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}
