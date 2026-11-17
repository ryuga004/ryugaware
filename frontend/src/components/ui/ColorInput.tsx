"use client";

import { cn } from "@/lib/cn";

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Colour swatch + hex field, used wherever a customer picks brand colours. The swatch is a native
 * colour input so every platform's own picker is available; the hex field keeps it keyboard-usable.
 */
export function ColorInput({
  value,
  onChange,
  id,
  invalid,
  disabled,
  className,
  ...aria
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-describedby"?: string;
}) {
  const safe = HEX.test(value) ? value : "#000000";
  return (
    <div
      className={cn(
        "flex h-9 w-full items-stretch overflow-hidden rounded-md border bg-surface transition-shadow",
        invalid ? "border-danger" : "border-line-strong",
        "focus-within:border-primary focus-within:ring-[3px] focus-within:ring-ember/20",
        disabled && "bg-subtle opacity-60",
        className,
      )}
    >
      <input
        type="color"
        value={safe}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Pick a colour"
        className="h-full w-10 shrink-0 cursor-pointer border-0 bg-transparent p-1"
      />
      <input
        id={id}
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="min-w-0 flex-1 border-l border-line-strong bg-transparent px-3 font-mono text-sm text-ink uppercase outline-none placeholder:text-faint"
        placeholder="#000000"
        {...aria}
      />
    </div>
  );
}

export const isHexColor = (value: string) => HEX.test(value);
