"use client";

import { useId } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export interface FieldControlProps {
  id: string;
  invalid: boolean;
  "aria-describedby"?: string;
}

/**
 * Label + control + hint / error / success text. The control is a render prop so any input
 * (Input, Select, custom) receives the right `id`, `invalid` and `aria-describedby` automatically.
 */
export function FormField({
  label,
  hint,
  error,
  success,
  required,
  labelAction,
  className,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  success?: string;
  required?: boolean;
  labelAction?: React.ReactNode;
  className?: string;
  children: (control: FieldControlProps) => React.ReactNode;
}) {
  const id = useId();
  const messageId = `${id}-msg`;
  const hasMessage = Boolean(error || success || hint);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
        {labelAction}
      </div>
      {children({ id, invalid: Boolean(error), "aria-describedby": hasMessage ? messageId : undefined })}
      {hasMessage && (
        <p id={messageId} className={cn("flex items-start gap-1.5 text-xs", error ? "text-danger-hover" : success ? "text-success" : "text-muted")}>
          {error && <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />}
          {!error && success && <CircleCheck className="mt-px size-3.5 shrink-0" aria-hidden />}
          <span>{error ?? success ?? hint}</span>
        </p>
      )}
    </div>
  );
}
