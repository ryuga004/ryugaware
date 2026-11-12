"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { dismissToast, selectToasts, type Toast } from "@/features/ui/slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const ICONS = {
  success: <CircleCheck className="size-5 shrink-0 text-[#7cc8a4]" aria-hidden />,
  error: <CircleAlert className="size-5 shrink-0 text-[#f28b82]" aria-hidden />,
  info: <Info className="size-5 shrink-0 text-glow" aria-hidden />,
};

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), toast.tone === "error" ? 7000 : 4500);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id, toast.tone]);

  return (
    <div role={toast.tone === "error" ? "alert" : "status"} className="animate-toast-in flex w-full items-start gap-3 rounded-[10px] bg-ink px-4 py-3 text-page shadow-pop">
      {ICONS[toast.tone]}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs text-on-dark">{toast.description}</p>}
      </div>
      {toast.action && (
        <Link href={toast.action.href} onClick={() => dispatch(dismissToast(toast.id))} className="text-sm font-medium whitespace-nowrap text-glow hover:underline">
          {toast.action.label}
        </Link>
      )}
      <button type="button" aria-label="Dismiss notification" onClick={() => dispatch(dismissToast(toast.id))} className="rounded p-0.5 text-on-dark hover:text-page">
        <X className="size-4" />
      </button>
    </div>
  );
}

/** Bottom-right on desktop, top on mobile. Driven entirely by the `ui` slice. */
export function ToastViewport() {
  const toasts = useAppSelector(selectToasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-24 sm:w-[380px]">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}
