import { cn } from "@/lib/cn";
import { Illustration, type IllustrationName } from "./Illustration";

/**
 * "Nothing here yet" / "no results" block. Pass `illustration` for the generated artwork,
 * or `icon` for the drawn fallback (ink tile with rings).
 */
export function EmptyState({
  icon,
  illustration,
  title,
  description,
  actions,
  compact,
  className,
  children,
}: {
  icon?: React.ReactNode;
  illustration?: IllustrationName;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  compact?: boolean;
  className?: string;
  /** Extra content under the actions (e.g. a how-it-works diagram). */
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-card border border-line bg-surface px-6 text-center", compact ? "py-10" : "py-14", className)}>
      {illustration ? (
        <Illustration name={illustration} size={compact ? 112 : 160} className="mb-4" />
      ) : (
        <div className="relative mb-6 flex size-[88px] items-center justify-center rounded-full border border-line">
          <div className="absolute inset-2 rounded-full border border-line" />
          <div className="relative flex size-12 items-center justify-center rounded-[14px] bg-ink text-glow">{icon}</div>
          <span className="absolute top-1 right-2 size-3.5 rounded-full bg-ember" />
        </div>
      )}
      <h2 className="font-heading text-xl font-semibold text-ink">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm text-muted">{description}</p>}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-3 max-sm:w-full max-sm:flex-col">{actions}</div>}
      {children}
    </div>
  );
}
