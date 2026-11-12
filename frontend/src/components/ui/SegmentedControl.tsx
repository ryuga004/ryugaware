import { cn } from "@/lib/cn";

export interface SegmentedOption<V extends string> {
  value: V;
  label: React.ReactNode;
  /** Accessible name when `label` is an icon. */
  ariaLabel?: string;
}

export interface SegmentedControlProps<V extends string> {
  value: V;
  onChange: (value: V) => void;
  options: SegmentedOption<V>[];
  ariaLabel: string;
  className?: string;
}

export function SegmentedControl<V extends string>({ value, onChange, options, ariaLabel, className }: SegmentedControlProps<V>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("inline-flex rounded-lg border border-line bg-subtle p-[3px]", className)}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-[28px] items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
              selected ? "border border-line bg-surface text-ink" : "border border-transparent text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
