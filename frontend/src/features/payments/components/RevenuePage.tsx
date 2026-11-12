"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { BarList, ColumnChart } from "@/components/platform/Charts";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { FilterSelect } from "@/components/platform/FilterSelect";
import { StatGrid, StatTile } from "@/components/platform/StatTile";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { WebsiteSelect } from "@/features/websites/components/WebsiteSelect";
import { cn } from "@/lib/cn";
import { formatMoney, formatMoneyCompact, formatNumber, formatPercent, pluralize } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetRevenueQuery } from "../api";
import { REVENUE_RANGE, REVENUE_RANGE_OPTIONS } from "../constants";
import { selectRevenueFilters, setRevenueRange, setRevenueWebsite } from "../slice";
import type { RevenueSummary } from "../types";

/** "↑ 12.4% vs previous 30 days": green when up, red when down, nothing when there's no earlier period. */
function Change({ now, before, label, points }: { now: number | null; before: number | null | undefined; label: string; points?: boolean }) {
  if (now === null || before === null || before === undefined || (!points && before === 0)) return <span>No earlier data to compare</span>;
  const delta = points ? (now - before) * 100 : ((now - before) / before) * 100;
  const up = delta >= 0;
  const text = points ? `${Math.abs(delta).toFixed(1)} pts` : `${Math.abs(delta).toFixed(1)}%`;
  return (
    <span className={cn("inline-flex items-center gap-1", up ? "text-success" : "text-danger-hover")}>
      {up ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />}
      <span className="sr-only">{up ? "Up" : "Down"}</span>
      {text} vs {label}
    </span>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-card border border-line bg-surface p-5 sm:p-6", className)}>
      <h2 className="font-heading mb-4 text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function RevenuePage() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectRevenueFilters);
  const { data, isLoading, isFetching, isError, refetch } = useGetRevenueQuery(filters);
  const range = REVENUE_RANGE[filters.range];

  const neverAny = !isLoading && !isError && data?.hasAnyTransactions === false;
  const emptyPeriod = !isLoading && !isError && data !== undefined && data.hasAnyTransactions && data.transactions === 0;

  if (neverAny) {
    return (
      <EmptyState
        illustration="revenue"
        title="No revenue yet"
        description="Revenue appears here after your first successful payment. Set up a payment method so customers can pay at checkout."
        actions={
          <ButtonLink href="/payments" variant="secondary">
            View payment methods
          </ButtonLink>
        }
      />
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <FilterSelect label="Period" value={filters.range} options={REVENUE_RANGE_OPTIONS} onChange={(v) => dispatch(setRevenueRange(v))} className="sm:w-44" />
        <WebsiteSelect value={filters.websiteId} onChange={(v) => dispatch(setRevenueWebsite(v))} label="Filter by website" className="sm:w-48" />
      </div>

      {isError ? (
        <ErrorState title="We couldn’t load your revenue" onRetry={refetch} retrying={isFetching} />
      ) : (
        <div className={cn("flex flex-col gap-6 transition-opacity", isFetching && !isLoading && "opacity-60")} aria-busy={isFetching}>
          <Tiles data={data} loading={isLoading} previousLabel={range.previousLabel} />

          {emptyPeriod ? (
            <EmptyState
              illustration="revenue"
              title="No revenue in this period"
              description="There were no payments in this period. Try a wider date range or another website."
              actions={
                filters.range !== "12m" && (
                  <Button variant="secondary" onClick={() => dispatch(setRevenueRange("12m"))}>
                    Last 12 months
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <Panel title={range.chartTitle} className="lg:col-span-2">
                {isLoading || !data ? (
                  <Skeleton className="h-[260px] w-full" />
                ) : (
                  <ColumnChart data={data.series} caption={range.chartCaption} format={(v) => formatMoney(v)} formatAxis={formatMoneyCompact} height={220} />
                )}
              </Panel>
              <Panel title="By payment method">
                {isLoading || !data ? (
                  <div className="space-y-5">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i}>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="mt-2 h-2 w-full" />
                      </div>
                    ))}
                  </div>
                ) : data.byMethod.length ? (
                  <BarList data={data.byMethod} caption="Share of gross revenue" format={formatMoneyCompact} />
                ) : (
                  <p className="text-sm text-muted">No successful payments in this period.</p>
                )}
              </Panel>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Tiles({ data, loading, previousLabel }: { data: RevenueSummary | undefined; loading: boolean; previousLabel: string }) {
  const d = data;
  const zero = d !== undefined && d.transactions === 0;
  return (
    <StatGrid className="xl:grid-cols-3">
      <StatTile
        label="Gross revenue"
        loading={loading || !d}
        value={d && formatMoney(d.gross)}
        sub={d && (zero ? "No payments in this period" : <Change now={d.gross} before={d.previous?.gross} label={previousLabel} />)}
      />
      <StatTile
        label="Gateway fees"
        loading={loading || !d}
        value={d && formatMoney(d.fees)}
        sub={d && (zero || d.gross === 0 ? "No payments in this period" : `${formatPercent(d.fees / d.gross)} of gross revenue`)}
      />
      <StatTile
        label="Net revenue"
        loading={loading || !d}
        value={d && formatMoney(d.net)}
        sub={d && (zero ? "No payments in this period" : <Change now={d.net} before={d.previous?.net} label={previousLabel} />)}
      />
      <StatTile
        label="Transactions"
        loading={loading || !d}
        value={d && formatNumber(d.transactions)}
        sub={d && `${formatNumber(d.succeeded)} succeeded · ${formatNumber(d.failed)} failed${d.pending ? ` · ${formatNumber(d.pending)} pending` : ""}`}
      />
      <StatTile
        label="Success rate"
        loading={loading || !d}
        value={d && (d.successRate === null ? "—" : formatPercent(d.successRate))}
        sub={d && (d.successRate === null ? "No completed payments" : <Change now={d.successRate} before={d.previous?.successRate} label={previousLabel} points />)}
      />
      <StatTile label="Refunded" loading={loading || !d} value={d && formatMoney(d.refunded)} sub={d && (d.refunds ? pluralize(d.refunds, "refund") : "No refunds")} />
    </StatGrid>
  );
}
