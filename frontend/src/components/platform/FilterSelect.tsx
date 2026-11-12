import { Select, type SelectOption } from "@/components/ui/Select";
import { cn } from "@/lib/cn";

/** Compact labelled dropdown for filter bars. */
export function FilterSelect<V extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: V;
  options: SelectOption<V>[];
  onChange: (value: V) => void;
  className?: string;
}) {
  return (
    <Select
      aria-label={label}
      value={value}
      options={options}
      onChange={(e) => onChange(e.target.value as V)}
      className={cn("sm:w-40", className)}
    />
  );
}
