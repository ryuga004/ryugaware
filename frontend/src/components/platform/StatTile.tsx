import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

/** Headline number with a label and an optional supporting line. */
export function StatTile({
  label,
  value,
  sub,
  loading,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card border border-line bg-surface p-5", className)}>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-7 w-28" />
          <Skeleton className="mt-2 h-3 w-20" />
        </>
      ) : (
        <>
          <p className="font-heading mt-2 text-2xl font-semibold text-ink tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
        </>
      )}
    </div>
  );
}

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6", className)}>{children}</div>;
}
