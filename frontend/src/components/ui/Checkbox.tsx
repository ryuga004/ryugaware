import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: React.ReactNode;
}

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={cn("inline-flex cursor-pointer items-start gap-2.5 text-sm text-ink", props.disabled && "cursor-not-allowed opacity-60", className)}>
      <span className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          className="peer absolute inset-0 size-4 cursor-pointer appearance-none rounded border border-line-strong bg-surface checked:border-primary checked:bg-primary"
          {...props}
        />
        <Check className="pointer-events-none relative size-3 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} aria-hidden />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}
