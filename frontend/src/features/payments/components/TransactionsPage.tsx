"use client";

import { useCallback } from "react";
import { DataTable, type Column } from "@/components/platform/DataTable";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { FilterSelect } from "@/components/platform/FilterSelect";
import { Pagination } from "@/components/platform/Pagination";
import { SearchInput } from "@/components/platform/SearchInput";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { WebsiteSelect } from "@/features/websites/components/WebsiteSelect";
import { cn } from "@/lib/cn";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetTransactionsQuery } from "../api";
import { TX_METHOD_OPTIONS, TX_PAGE_SIZES, TX_RANGE_OPTIONS, TX_STATUS, TX_STATUS_OPTIONS } from "../constants";
import {
  clearTxFilters,
  openTransaction,
  selectTxFilters,
  selectTxHasFilters,
  setTxMethod,
  setTxPage,
  setTxPageSize,
  setTxRange,
  setTxSearch,
  setTxStatus,
  setTxWebsite,
} from "../slice";
import type { Transaction } from "../types";
import { RefundDialog } from "./RefundDialog";
import { TransactionModal } from "./TransactionModal";

const money = (n: number) => formatMoney(n, { paise: true });

export function TransactionsPage() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectTxFilters);
  const hasFilters = useAppSelector(selectTxHasFilters);
  const { data, isLoading, isFetching, isError, refetch } = useGetTransactionsQuery(filters);

  const onSearch = useCallback((v: string) => dispatch(setTxSearch(v)), [dispatch]);
  const open = (t: Transaction) => dispatch(openTransaction(t.id));

  const rows = data?.data;
  const noneAtAll = !isLoading && !isError && data?.meta.counts.all === 0;
  const noResults = !isLoading && !isError && rows?.length === 0 && !noneAtAll;

  const columns: Column<Transaction>[] = [
    {
      key: "id",
      header: "Transaction",
      cell: (t) => (
        <div className="min-w-0">
          <button type="button" onClick={() => open(t)} className="font-mono text-[13px] font-medium text-ink hover:underline" aria-label={`View ${t.id}`}>
            {t.id}
          </button>
          <p className="text-xs text-muted">{t.orderId}</p>
        </div>
      ),
    },
    { key: "date", header: "Date (UTC)", cell: (t) => <span className="whitespace-nowrap text-body tabular-nums">{formatDateTime(t.createdAt).replace(" UTC", "")}</span> },
    { key: "website", header: "Website", cell: (t) => <span className="text-body">{t.websiteName}</span> },
    { key: "customer", header: "Customer", cell: (t) => <span className="text-body">{t.customerName}</span> },
    { key: "method", header: "Method", cell: (t) => <span className="whitespace-nowrap text-body">{t.methodLabel}</span> },
    { key: "amount", header: "Amount", align: "right", cell: (t) => <span className="font-medium whitespace-nowrap text-ink tabular-nums">{money(t.amount)}</span> },
    { key: "fee", header: "Fee", align: "right", cell: (t) => <span className="whitespace-nowrap text-muted tabular-nums">{money(t.fee)}</span> },
    { key: "status", header: "Status", cell: (t) => <StatusBadge value={t.status} map={TX_STATUS} /> },
  ];

  return (
    <>
      {noneAtAll ? (
        <EmptyState
          illustration="payments"
          title="No transactions yet"
          description="Payments from your websites will appear here as soon as customers start checking out."
          actions={
            <ButtonLink href="/payments" variant="secondary">
              View payment methods
            </ButtonLink>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchInput value={filters.search} onChange={onSearch} placeholder="Search ID, order or customer" className="xl:w-64" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
              <WebsiteSelect value={filters.websiteId} onChange={(v) => dispatch(setTxWebsite(v))} label="Filter by website" className="lg:w-44" />
              <FilterSelect label="Filter by method" value={filters.method} options={TX_METHOD_OPTIONS} onChange={(v) => dispatch(setTxMethod(v))} className="sm:w-auto lg:w-40" />
              <FilterSelect label="Filter by status" value={filters.status} options={TX_STATUS_OPTIONS} onChange={(v) => dispatch(setTxStatus(v))} className="sm:w-auto lg:w-36" />
              <FilterSelect label="Date range" value={filters.range} options={TX_RANGE_OPTIONS} onChange={(v) => dispatch(setTxRange(v))} className="sm:w-auto lg:w-36" />
            </div>
            {hasFilters && (
              <button type="button" onClick={() => dispatch(clearTxFilters())} className="self-start text-sm font-medium whitespace-nowrap text-primary hover:underline xl:self-center">
                Clear filters
              </button>
            )}
          </div>

          {/* Summary for the current filters. */}
          <div className="mb-4 min-h-5 text-sm text-muted tabular-nums" aria-live="polite">
            {data && !isError ? (
              <>
                <span className="font-medium text-ink">{formatNumber(data.meta.summary.count)}</span> {data.meta.summary.count === 1 ? "transaction" : "transactions"}
                {" · "}
                <span className="font-medium text-ink">{formatMoney(data.meta.summary.collected)}</span> collected
              </>
            ) : isLoading ? (
              <Skeleton className="h-4 w-56" />
            ) : null}
          </div>

          {isError ? (
            <ErrorState title="We couldn’t load your transactions" onRetry={refetch} retrying={isFetching} />
          ) : noResults ? (
            <EmptyState
              illustration="no-results"
              title="No transactions match your filters"
              description={filters.range !== "all" ? "Try a different search, a wider date range or clear the filters." : "Try a different search or clear the filters."}
              actions={
                <>
                  {filters.range !== "all" && (
                    <Button variant="secondary" onClick={() => dispatch(setTxRange("all"))}>
                      Show all time
                    </Button>
                  )}
                  {hasFilters && (
                    <Button variant="secondary" onClick={() => dispatch(clearTxFilters())}>
                      Clear filters
                    </Button>
                  )}
                </>
              }
            />
          ) : (
            <div className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")} aria-busy={isFetching}>
              <DataTable caption="Transactions" className="hidden md:block" columns={columns} rows={rows} getRowId={(t) => t.id} loading={isLoading} skeletonRows={8} />
              {/* Mobile: tappable cards. */}
              <ul className="flex flex-col gap-3 md:hidden">
                {isLoading || !rows
                  ? Array.from({ length: 5 }, (_, i) => (
                      <li key={i} className="rounded-card border border-line bg-surface p-4">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="mt-3 h-3 w-1/2" />
                      </li>
                    ))
                  : rows.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => open(t)}
                          aria-label={`View ${t.id}`}
                          className="block w-full rounded-card border border-line bg-surface p-4 text-left transition-colors hover:bg-page/60"
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-ink">{t.customerName}</span>
                              <span className="mt-0.5 block truncate text-xs text-muted">
                                {t.websiteName} · {t.methodLabel}
                              </span>
                            </span>
                            <span className="shrink-0 font-medium text-ink tabular-nums">{money(t.amount)}</span>
                          </span>
                          <span className="mt-3 flex items-center justify-between gap-3">
                            <StatusBadge value={t.status} map={TX_STATUS} />
                            <span className="truncate text-xs text-muted tabular-nums">
                              <span className="font-mono">{t.id}</span> · {formatDateTime(t.createdAt).replace(" UTC", "")}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
              </ul>
            </div>
          )}

          {data && !isError && (
            <Pagination
              className="mt-6"
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              pageSize={data.meta.pageSize}
              pageSizeOptions={TX_PAGE_SIZES}
              itemLabel={data.meta.total === 1 ? "transaction" : "transactions"}
              disabled={isFetching}
              onPageChange={(p) => dispatch(setTxPage(p))}
              onPageSizeChange={(n) => dispatch(setTxPageSize(n))}
            />
          )}
        </>
      )}

      <TransactionModal />
      <RefundDialog />
    </>
  );
}
