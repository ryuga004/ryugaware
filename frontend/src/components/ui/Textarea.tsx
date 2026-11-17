import { cn } from "@/lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/** Multi-line text control. Same border, focus ring and disabled treatment as `Input`. */
export function Textarea({ invalid, className, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-md border bg-surface px-3 py-2 text-sm text-ink outline-none transition-shadow placeholder:text-faint",
        invalid ? "border-danger" : "border-line-strong",
        "focus:border-primary focus:ring-[3px] focus:ring-ember/20",
        "read-only:bg-subtle disabled:bg-subtle disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
