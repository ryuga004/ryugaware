"use client";

import { Select } from "@/components/ui/Select";
import { useGetWebsiteOptionsQuery } from "../api";

/**
 * Website picker for other sections: filters ("All websites") and configuration scope
 * ("Default for all websites"). `value` is "all" / "default" or a website id.
 */
export function WebsiteSelect({
  value,
  onChange,
  allLabel = "All websites",
  allValue = "all",
  label = "Website",
  id,
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
  allValue?: string;
  /** Accessible name when there is no visible label. */
  label?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { data, isLoading } = useGetWebsiteOptionsQuery();
  const options = [{ value: allValue, label: allLabel }, ...(data ?? []).map((w) => ({ value: w.id, label: w.name }))];
  return (
    <Select
      id={id}
      aria-label={id ? undefined : label}
      value={value}
      options={options}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || isLoading}
      className={className}
    />
  );
}
