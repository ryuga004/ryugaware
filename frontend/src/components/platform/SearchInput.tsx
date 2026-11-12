"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

/** Debounced search box. `value` is the committed value (e.g. from Redux); `onChange` fires after `delay` ms. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  ariaLabel,
  delay = 300,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  delay?: number;
  className?: string;
}) {
  // `draft` holds what the user is typing until it is committed; null means "show the committed value".
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;

  useEffect(() => {
    if (draft === null) return;
    const t = setTimeout(() => {
      if (draft !== value) onChange(draft);
      setDraft(null);
    }, delay);
    return () => clearTimeout(t);
  }, [draft, value, delay, onChange]);

  return (
    <div className={cn("w-full sm:w-72", className)}>
      <Input
        type="search"
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        leftIcon={<Search className="size-4" aria-hidden />}
        rightSlot={
          shown ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setDraft(null);
                onChange("");
              }}
              className="rounded p-1 text-muted hover:text-ink"
            >
              <X className="size-4" />
            </button>
          ) : null
        }
        className="[&_input::-webkit-search-cancel-button]:hidden"
      />
    </div>
  );
}
