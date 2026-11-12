"use client";

import { useCallback } from "react";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/platform/DataTable";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { FilterSelect } from "@/components/platform/FilterSelect";
import { Pagination } from "@/components/platform/Pagination";
import { SearchInput } from "@/components/platform/SearchInput";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { WebsiteSelect } from "@/features/websites/components/WebsiteSelect";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useAddRecommendedMethodsMutation, useGetDeliveryMethodsQuery, useUpdateDeliveryMethodMutation } from "../api";
import { METHOD_PAGE_SIZES, METHOD_STATUS_OPTIONS, formatAvailability, formatCoverage, formatDeliveryTime, formatFee } from "../constants";
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
  setMethodStatus,
  setMethodWebsite,
} from "../slice";
import type { DeliveryMethod } from "../types";
import { DeleteMethodDialog } from "./DeleteMethodDialog";
import { DeliveryMark } from "./DeliveryMark";
import { MethodDrawer } from "./MethodDrawer";

export function DeliveryMethodsPage() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectMethodFilters);
  const hasFilters = useAppSelector(selectMethodHasFilters);
  const { data, isLoading, isFetching, isError, refetch } = useGetDeliveryMethodsQuery(filters);
  const [toggle] = useUpdateDeliveryMethodMutation();
  const [addRecommended, recommendedState] = useAddRecommendedMethodsMutation();

  const onSearch = useCallback((v: string) => dispatch(setMethodSearch(v)), [dispatch]);

  const rows = data?.data;
  const nothingAtAll = !isLoading && !isError && data?.meta.counts.all === 0;
  const noResults = !isLoading && !isError && rows?.length === 0 && hasFilters;

  const enabledSwitch = (m: DeliveryMethod) => (
    <Switch checked={m.enabled} onCheckedChange={(enabled) => toggle({ id: m.id, changes: { enabled } })} aria-label={`${m.enabled ? "Disable" : "Enable"} ${m.name}`} />
  );

  const rowActions = (m: DeliveryMethod) => (
    <div className="flex items-center justify-end gap-1">
      <IconButton label={`Edit ${m.name}`} onClick={() => dispatch(openEditMethod(m.id))}>
        <Pencil className="size-4" />
      </IconButton>
      <IconButton label={`Delete ${m.name}`} danger onClick={() => dispatch(requestDeleteMethod(m.id))}>
        <Trash2 className="size-4" />
      </IconButton>
    </div>
  );

  const columns: Column<DeliveryMethod>[] = [
    {
      key: "method",
      header: "Method",
      cell: (m) => (
        <div className="flex min-w-0 items-center gap-3">
          <DeliveryMark type={m.type} />
          <div className="min-w-0">
            <button type="button" onClick={() => dispatch(openEditMethod(m.id))} className="block max-w-full truncate text-left font-medium text-ink hover:underline">
              {m.name}
            </button>
            <p className="truncate text-xs text-muted">{m.carrier === "Self" ? "Your own staff" : m.carrier}</p>
          </div>
        </div>
      ),
    },
    { key: "time", header: "Delivery time", cell: (m) => <span className="whitespace-nowrap text-body">{formatDeliveryTime(m)}</span> },
    { key: "fee", header: "Fee", cell: (m) => <span className="text-ink tabular-nums">{formatFee(m)}</span> },
    { key: "coverage", header: "Coverage", cell: (m) => <span className="text-body">{formatCoverage(m)}</span> },
    {
      key: "websites",
      header: "Available on",
      cell: (m) => (
        <span className="text-body" title={m.websiteNames.join(", ") || undefined}>
          {formatAvailability(m)}
        </span>
      ),
    },
    { key: "enabled", header: "Enabled", cell: enabledSwitch },
    { key: "actions", header: <span className="sr-only">Actions</span>, align: "right", className: "w-[96px]", cell: rowActions },
  ];

  const addButton = (
    <Button leftIcon={<Plus className="size-4" />} onClick={() => dispatch(openAddMethod())}>
      Add delivery method
    </Button>
  );

  return (
    <>
      {nothingAtAll ? (
        <EmptyState
          illustration="delivery"
          title="Add your first delivery method"
          description="Tell customers how and when their orders arrive. Set a fee, a delivery time and the areas you cover."
          actions={
            <>
              {addButton}
              <Button variant="secondary" leftIcon={<Sparkles className="size-4" />} loading={recommendedState.isLoading} onClick={() => addRecommended()}>
                Add recommended methods
              </Button>
            </>
          }
        />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput value={filters.search} onChange={onSearch} placeholder="Search methods or carriers" />
            <div className="flex flex-col gap-3 sm:flex-row">
              <WebsiteSelect value={filters.websiteId} onChange={(v) => dispatch(setMethodWebsite(v))} label="Filter by website" className="sm:w-48" />
              <FilterSelect label="Filter by status" value={filters.status} options={METHOD_STATUS_OPTIONS} onChange={(v) => dispatch(setMethodStatus(v))} />
            </div>
            {hasFilters && (
              <button type="button" onClick={() => dispatch(clearMethodFilters())} className="self-start text-sm font-medium text-primary hover:underline lg:self-center">
                Clear filters
              </button>
            )}
            {data && data.meta.counts.enabled === 0 && (
              <Badge tone="warning" className="self-start lg:ml-auto lg:self-center">
                No method is enabled: checkout is closed
              </Badge>
            )}
          </div>

          {isError ? (
            <ErrorState title="We couldn’t load your delivery methods" onRetry={refetch} retrying={isFetching} />
          ) : noResults ? (
            <EmptyState
              illustration="no-results"
              title="No delivery methods match your filters"
              description="Try a different search or clear the filters."
              actions={
                <Button variant="secondary" onClick={() => dispatch(clearMethodFilters())}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")} aria-busy={isFetching}>
              <DataTable
                caption="Delivery methods"
                className="hidden md:block"
                columns={columns}
                rows={rows}
                getRowId={(m) => m.id}
                loading={isLoading}
                skeletonRows={4}
                rowClassName={(m) => (m.enabled ? undefined : "[&_td]:text-muted")}
              />
              <ul className="flex flex-col gap-3 md:hidden">
                {isLoading || !rows
                  ? Array.from({ length: 3 }, (_, i) => (
                      <li key={i} className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
                        <Skeleton className="h-9 w-[54px]" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="mt-2 h-3 w-1/3" />
                        </div>
                      </li>
                    ))
                  : rows.map((m) => (
                      <li key={m.id} className="rounded-card border border-line bg-surface p-4">
                        <div className="flex items-start gap-3">
                          <DeliveryMark type={m.type} />
                          <div className="min-w-0 flex-1">
                            <button type="button" onClick={() => dispatch(openEditMethod(m.id))} className="block max-w-full truncate text-left font-medium text-ink">
                              {m.name}
                            </button>
                            <p className="truncate text-xs text-muted">
                              {m.carrier === "Self" ? "Your own staff" : m.carrier} · {formatDeliveryTime(m)}
                            </p>
                          </div>
                          {enabledSwitch(m)}
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <dt className="text-xs text-muted">Fee</dt>
                            <dd className="text-ink tabular-nums">{formatFee(m)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">Coverage</dt>
                            <dd className="text-ink">{formatCoverage(m)}</dd>
                          </div>
                          <div className="col-span-2 flex items-end justify-between gap-2">
                            <div>
                              <dt className="text-xs text-muted">Available on</dt>
                              <dd className="text-ink">{formatAvailability(m)}</dd>
                            </div>
                            {rowActions(m)}
                          </div>
                        </dl>
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
