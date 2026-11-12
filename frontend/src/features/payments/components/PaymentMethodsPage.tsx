"use client";

import { useCallback } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/platform/DataTable";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { FilterSelect } from "@/components/platform/FilterSelect";
import { Pagination } from "@/components/platform/Pagination";
import { SearchInput } from "@/components/platform/SearchInput";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { WebsiteSelect } from "@/features/websites/components/WebsiteSelect";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { paymentsApi, useGetPaymentMethodsQuery, useSetPaymentMethodEnabledMutation } from "../api";
import { formatAvailability, formatMethodFees, METHOD_MODE, METHOD_PAGE_SIZES, methodMode, PAYMENT_PROVIDER, PAYMENT_TYPE, PAYMENT_TYPE_OPTIONS } from "../constants";
import {
  clearMethodFilters,
  openAddMethod,
  openEditMethod,
  requestDeleteMethod,
  selectMethodFilters,
  selectMethodHasFilters,
  setMethodPage,
  setMethodPageSize,
  setMethodSearch,
  setMethodType,
  setMethodWebsite,
} from "../slice";
import type { PaymentMethod } from "../types";
import { DeleteMethodDialog } from "./DeleteMethodDialog";
import { MethodDrawer } from "./MethodDrawer";
import { MethodMark } from "./MethodMark";

export function PaymentMethodsPage() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectMethodFilters);
  const hasFilters = useAppSelector(selectMethodHasFilters);
  const { data, isLoading, isFetching, isError, refetch } = useGetPaymentMethodsQuery(filters);
  const [setEnabled] = useSetPaymentMethodEnabledMutation();

  const onSearch = useCallback((v: string) => dispatch(setMethodSearch(v)), [dispatch]);
  // Seed the detail cache from the row so the edit drawer opens with the form straight away.
  const edit = (m: PaymentMethod) => {
    dispatch(paymentsApi.util.upsertQueryData("getPaymentMethod", m.id, m));
    dispatch(openEditMethod(m.id));
  };

  const rows = data?.data;
  const noMethodsAtAll = !isLoading && !isError && data?.meta.counts.all === 0;
  const noResults = !isLoading && !isError && rows?.length === 0 && hasFilters;

  const enabledSwitch = (m: PaymentMethod) => (
    <Switch checked={m.enabled} onCheckedChange={(enabled) => setEnabled({ id: m.id, enabled })} aria-label={`Enable ${m.displayName}`} />
  );

  const rowActions = (m: PaymentMethod) => (
    <div className="flex items-center justify-end gap-1">
      <IconButton label={`Edit ${m.displayName}`} onClick={() => edit(m)}>
        <Pencil className="size-4" />
      </IconButton>
      <IconButton label={`Delete ${m.displayName}`} danger onClick={() => dispatch(requestDeleteMethod(m))}>
        <Trash2 className="size-4" />
      </IconButton>
    </div>
  );

  const nameCell = (m: PaymentMethod) => (
    <div className="flex min-w-0 items-center gap-3">
      <MethodMark type={m.type} />
      <div className="min-w-0">
        <button type="button" onClick={() => edit(m)} className="block max-w-full truncate text-left font-medium text-ink hover:underline">
          {m.displayName}
        </button>
        <p className="truncate text-xs text-muted">{PAYMENT_PROVIDER[m.provider].label}</p>
      </div>
    </div>
  );

  const columns: Column<PaymentMethod>[] = [
    { key: "method", header: "Method", cell: nameCell, className: "max-w-[320px]" },
    { key: "type", header: "Type", cell: (m) => <Badge tone="neutral">{PAYMENT_TYPE[m.type].label}</Badge> },
    { key: "fees", header: "Fees", cell: (m) => <span className="text-body tabular-nums">{formatMethodFees(m)}</span> },
    { key: "mode", header: "Mode", cell: (m) => <StatusBadge value={methodMode(m)} map={METHOD_MODE} /> },
    {
      key: "available",
      header: "Available on",
      cell: (m) => (
        <span className="text-body" title={m.appliesTo === "selected" ? m.websiteNames.join(", ") : undefined}>
          {formatAvailability(m)}
        </span>
      ),
    },
    { key: "enabled", header: "Enabled", cell: enabledSwitch },
    { key: "actions", header: <span className="sr-only">Actions</span>, align: "right", className: "w-[96px]", cell: rowActions },
  ];

  const addButton = (
    <Button leftIcon={<Plus className="size-4" />} onClick={() => dispatch(openAddMethod())}>
      Add payment method
    </Button>
  );

  return (
    <>
      {noMethodsAtAll ? (
        <EmptyState
          illustration="payments"
          title="Add your first payment method"
          description="Accept cards, UPI, net banking or cash on delivery on your websites. You can enable them per website."
          actions={
            <>
              {addButton}
              <Button variant="secondary" onClick={() => dispatch(openAddMethod({ type: "card", provider: "razorpay" }))}>
                Connect Razorpay
              </Button>
            </>
          }
        />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput value={filters.search} onChange={onSearch} placeholder="Search methods" />
            <div className="flex flex-col gap-3 sm:flex-row">
              <WebsiteSelect value={filters.websiteId} onChange={(v) => dispatch(setMethodWebsite(v))} label="Filter by website" className="sm:w-48" />
              <FilterSelect label="Filter by type" value={filters.type} options={PAYMENT_TYPE_OPTIONS} onChange={(v) => dispatch(setMethodType(v))} />
            </div>
            {hasFilters && (
              <button type="button" onClick={() => dispatch(clearMethodFilters())} className="self-start text-sm font-medium text-primary hover:underline lg:self-center">
                Clear filters
              </button>
            )}
            {data && data.meta.counts.all > 0 && (
              <p className="text-xs text-muted tabular-nums lg:ml-auto">
                {data.meta.counts.enabled} of {data.meta.counts.all} enabled
              </p>
            )}
          </div>

          {isError ? (
            <ErrorState title="We couldn’t load your payment methods" onRetry={refetch} retrying={isFetching} />
          ) : noResults ? (
            <EmptyState
              illustration="no-results"
              title="No payment methods match your filters"
              description="Try a different search or clear the filters."
              actions={
                <Button variant="secondary" onClick={() => dispatch(clearMethodFilters())}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")} aria-busy={isFetching}>
              <DataTable caption="Payment methods" className="hidden md:block" columns={columns} rows={rows} getRowId={(m) => m.id} loading={isLoading} skeletonRows={5} />
              {/* Mobile: cards instead of a sideways-scrolling table. */}
              <ul className="flex flex-col gap-3 md:hidden">
                {isLoading || !rows
                  ? Array.from({ length: 4 }, (_, i) => (
                      <li key={i} className="flex gap-3 rounded-card border border-line bg-surface p-4">
                        <Skeleton className="h-8 w-12" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="mt-3 h-3 w-1/3" />
                        </div>
                      </li>
                    ))
                  : rows.map((m) => (
                      <li key={m.id} className="rounded-card border border-line bg-surface p-4">
                        <div className="flex items-start justify-between gap-3">
                          {nameCell(m)}
                          {enabledSwitch(m)}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge tone="neutral">{PAYMENT_TYPE[m.type].label}</Badge>
                          <StatusBadge value={methodMode(m)} map={METHOD_MODE} />
                          <span className="text-xs text-muted tabular-nums">{formatMethodFees(m)}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                          <p className="min-w-0 truncate text-xs text-muted">{formatAvailability(m)}</p>
                          {rowActions(m)}
                        </div>
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
              pageSizeOptions={METHOD_PAGE_SIZES}
              itemLabel={data.meta.total === 1 ? "method" : "methods"}
              disabled={isFetching}
              onPageChange={(p) => dispatch(setMethodPage(p))}
              onPageSizeChange={(n) => dispatch(setMethodPageSize(n))}
            />
          )}
        </>
      )}

      <MethodDrawer />
      <DeleteMethodDialog />
    </>
  );
}
