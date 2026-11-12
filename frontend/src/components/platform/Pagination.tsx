import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";

function pageList(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [6, 12, 24],
  itemLabel = "items",
  disabled,
  className,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  if (total === 0) return null;
  // Everything fits on one page at the smallest size: just state the count.
  if (totalPages <= 1 && total <= Math.min(pageSize, ...pageSizeOptions)) {
    return (
      <p className={cn("text-sm text-muted tabular-nums", className)}>
        {total} {itemLabel}
      </p>
    );
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn =
    "inline-flex size-8 items-center justify-center rounded-md border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45";
  return (
    <nav aria-label="Pagination" className={cn("flex flex-col items-center justify-between gap-3 sm:flex-row", className)}>
      <p className="text-sm text-muted tabular-nums">
        Showing {from}–{to} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <Select
            aria-label="Rows per page"
            selectSize="sm"
            className="w-[110px]"
            value={String(pageSize)}
            options={pageSizeOptions.map((n) => ({ value: String(n), label: `${n} / page` }))}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
          />
        )}
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous page" className={cn(btn, "border-line-strong bg-surface hover:bg-subtle")} disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="size-4" />
          </button>
          {pageList(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                disabled={disabled}
                onClick={() => onPageChange(p)}
                className={cn(btn, p === page ? "border-ink bg-ink text-page" : "border-line-strong bg-surface text-ink hover:bg-subtle")}
              >
                {p}
              </button>
            ),
          )}
          <button type="button" aria-label="Next page" className={cn(btn, "border-line-strong bg-surface hover:bg-subtle")} disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
