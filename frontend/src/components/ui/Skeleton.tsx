import { cn } from "@/lib/cn";

/** Pulsing placeholder block. Compose several to build loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded bg-subtle", className)} />;
}
