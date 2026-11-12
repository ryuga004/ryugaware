import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

/**
 * Generic, presentational data table. Loading / empty / error states are handled here so every module
 * gets identical behaviour; the caller only supplies columns and rows.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  loading,
  skeletonRows = 4,
  emptyState,
  errorState,
  rowClassName,
  className,
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;
  rowClassName?: (row: T) => string | undefined;
  className?: string;
}) {
  if (errorState) return <>{errorState}</>;
  if (!loading && rows && rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className={cn("overflow-hidden rounded-card border border-line bg-surface", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm" aria-busy={loading || undefined}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-page">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn("h-10 px-4 text-xs font-medium tracking-wide text-muted uppercase", c.align === "right" ? "text-right" : "text-left", c.className)}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading || !rows
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className="h-14 px-4">
                        <Skeleton className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr key={getRowId(row)} className={cn("border-b border-line last:border-0 hover:bg-page/60", rowClassName?.(row))}>
                    {columns.map((c) => (
                      <td key={c.key} className={cn("h-14 px-4 align-middle text-ink-700", c.align === "right" && "text-right", c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
