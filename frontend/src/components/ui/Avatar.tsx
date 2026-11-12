import { cn } from "@/lib/cn";

export function Avatar({ name, size = 28, className }: { name: string; size?: 28 | 32 | 56; className?: string }) {
  const text = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-ink-800 font-semibold text-page",
        size === 56 ? "font-heading text-xl" : "text-xs",
        className,
      )}
    >
      {text}
    </span>
  );
}
