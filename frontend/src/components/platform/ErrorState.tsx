import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { Illustration } from "./Illustration";

export function ErrorState({
  title = "We couldn’t load this",
  description = "Check your connection and try again.",
  onRetry,
  retrying,
  compact,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  /** Smaller artwork for drawers, panels and table areas. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center rounded-card border border-line bg-surface px-6 text-center", compact ? "py-8" : "py-12", className)}>
      <Illustration name="error" size={compact ? 96 : 140} className="mb-3" />
      <h2 className="font-heading text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry} loading={retrying} leftIcon={<RefreshCw className="size-4" />}>
          Try again
        </Button>
      )}
    </div>
  );
}
