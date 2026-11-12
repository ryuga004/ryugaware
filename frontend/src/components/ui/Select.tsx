import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  selectSize?: "sm" | "md" | "lg";
}

export function Select({ options, placeholder, invalid, selectSize = "md", className, ...props }: SelectProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full appearance-none rounded-md border bg-surface pr-9 pl-3 text-sm text-ink outline-none transition-shadow",
          selectSize === "sm" ? "h-8" : selectSize === "md" ? "h-9" : "h-11",
          invalid ? "border-danger" : "border-line-strong",
          "focus:border-primary focus:ring-[3px] focus:ring-ember/20 disabled:bg-subtle disabled:opacity-60",
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}
