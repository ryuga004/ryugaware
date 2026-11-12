"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Right-side drawer used by every create / edit form (480px, full screen on mobile).
 * Focus is trapped, Esc closes, and closing with unsaved changes asks for confirmation.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  busy,
  dirty,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Footer content, or a function receiving `requestClose` so Cancel goes through the unsaved-changes guard. */
  footer?: React.ReactNode | ((api: { requestClose: () => void }) => React.ReactNode);
  /** True while submitting: closing is disabled. */
  busy?: boolean;
  /** True when the form has unsaved edits. */
  dirty?: boolean;
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const requestClose = () => {
    if (busy) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(o) => !o && requestClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="animate-fade-in fixed inset-0 z-40 bg-ink/40" />
          <Dialog.Content
            className="animate-drawer-in fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-drawer focus:outline-none sm:max-w-[480px] sm:rounded-l-sheet"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div>
                <Dialog.Title className="font-heading text-xl font-semibold text-ink">{title}</Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
                ) : (
                  <Dialog.Description className="sr-only">{title}</Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <IconButton label="Close" disabled={busy}>
                  <X className="size-5" />
                </IconButton>
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-3 border-t border-line bg-surface px-6 py-4 max-sm:[&>button]:flex-1">
                {typeof footer === "function" ? footer({ requestClose }) : footer}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={confirmDiscard}
        title="Discard unsaved changes?"
        description="Your changes will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="danger"
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  );
}
