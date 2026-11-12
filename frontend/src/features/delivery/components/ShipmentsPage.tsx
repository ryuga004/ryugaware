"use client";

import { useCallback } from "react";
import { DataTable, type Column } from "@/components/platform/DataTable";
import { CopyButton } from "@/components/platform/CopyButton";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { FilterSelect } from "@/components/platform/FilterSelect";
import { Pagination } from "@/components/platform/Pagination";
import { SearchInput } from "@/components/platform/SearchInput";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { ButtonLink, Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { WebsiteSelect } from "@/features/websites/components/WebsiteSelect";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetShipmentsQuery } from "../api";
import { SHIPMENT_METHOD_OPTIONS, SHIPMENT_PAGE_SIZES, SHIPMENT_STATUS, SHIPMENT_STATUS_OPTIONS } from "../constants";
import {
  clearShipmentFilters,
  openShipment,
  selectShipmentFilters,
  selectShipmentHasFilters,
  setShipmentMethod,
  setShipmentPage,
  setShipmentPageSize,
  setShipmentSearch,
  setShipmentStatus,
  setShipmentWebsite,
} from "../slice";
import type { Shipment } from "../types";
import { DeliveryMark } from "./DeliveryMark";
import { ReturnShipmentDialog } from "./ReturnShipmentDialog";
import { ShipmentDrawer } from "./ShipmentDrawer";

export function ShipmentsPage() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectShipmentFilters);
  const hasFilters = useAppSelector(selectShipmentHasFilters);
  const { data, isLoading, isFetching, isError, refetch } = useGetShipmentsQuery(filters);

  const onSearch = useCallback((v: string) => dispatch(setShipmentSearch(v)), [dispatch]);

  const rows = data?.data;
  const now = data?.meta.requestedAt ?? "";
  const nothingAtAll = !isLoading && !isError && data?.meta.counts.all === 0;
  const noResults = !isLoading && !isError && rows?.length === 0 && hasFilters;
  const failed = data?.meta.counts.failed ?? 0;

  const tracking = (s: Shipment) =>
    s.awb ? (
      <span className="flex items-center gap-0.5">
        <code className="font-mono text-xs whitespace-nowrap text-ink">{s.awb}</code>
        <CopyButton value={s.awb} label={`Copy tracking number for ${s.id}`} size="sm" />
      </span>
    ) : (
      <span className="text-xs text-muted">{s.methodType === "pickup" ? "Store pickup" : "Not shipped yet"}</span>
    );

  const columns: Column<Shipment>[] = [
    {
      key: "shipment",
      header: "Shipment",
      cell: (s) => (
        <div>
          <button type="button" onClick={() => dispatch(openShipment(s.id))} className="font-mono text-[13px] font-medium text-ink hover:underline">
            {s.id}
          </button>
          <p className="font-mono text-xs text-muted">{s.orderId}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (s) => (
        <div className="min-w-0">
          <p className="truncate text-ink">{s.customerName}</p>
          <p className="truncate text-xs text-muted">{s.destination.city}</p>
        </div>
      ),
    },
    { key: "website", header: "Website", cell: (s) => <span className="text-body">{s.websiteName}</span> },
    {
      key: "method",
      header: "Method",
      cell: (s) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <DeliveryMark type={s.methodType} carrier={s.carrier} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-ink">{s.methodName}</p>
            <p className="truncate text-xs text-muted">{s.carrier === "Self" ? "Your own staff" : s.carrier}</p>
          </div>
        </div>
      ),
    },
    { key: "awb", header: "Tracking", cell: tracking },
    { key: "status", header: "Status", cell: (s) => <StatusBadge value={s.status} map={SHIPMENT_STATUS} /> },
    { key: "updated", header: "Updated", cell: (s) => <span className="whitespace-nowrap text-muted tabular-nums">{formatRelative(s.updatedAt, now)}</span> },
  ];

  if (nothingAtAll) {
    return (
      <EmptyState
        illustration="delivery"
        title="No shipments yet"
        description="Shipments appear here once your websites receive orders and you hand them to a carrier."
        actions={
          <ButtonLink href="/delivery" variant="secondary">
            View delivery methods
          </ButtonLink>
        }
      />
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center">
        <SearchInput value={filters.search} onChange={onSearch} placeholder="Search shipment, order or tracking" className="xl:w-72" />
        <div className="grid gap-3 sm:grid-cols-3 xl:flex">
          <WebsiteSelect value={filters.websiteId} onChange={(v) => dispatch(setShipmentWebsite(v))} label="Filter by website" className="xl:w-44" />
          <FilterSelect label="Filter by method" value={filters.methodType} options={SHIPMENT_METHOD_OPTIONS} onChange={(v) => dispatch(setShipmentMethod(v))} className="xl:w-40" />
          <FilterSelect label="Filter by status" value={filters.status} options={SHIPMENT_STATUS_OPTIONS} onChange={(v) => dispatch(setShipmentStatus(v))} className="xl:w-44" />
        </div>
        {hasFilters && (
          <button type="button" onClick={() => dispatch(clearShipmentFilters())} className="self-start text-sm font-medium text-primary hover:underline xl:self-center">
            Clear filters
          </button>
        )}
        {failed > 0 && filters.status !== "failed" && (
          <button type="button" onClick={() => dispatch(setShipmentStatus("failed"))} className="self-start text-xs font-medium text-danger-hover hover:underline xl:ml-auto xl:self-center">
            {failed} failed {failed === 1 ? "delivery needs" : "deliveries need"} attention
          </button>
        )}
      </div>

      {isError ? (
        <ErrorState title="We couldn’t load your shipments" onRetry={refetch} retrying={isFetching} />
      ) : noResults ? (
        <EmptyState
          illustration="no-results"
          title="No shipments match your filters"
          description="Try a different search or clear the filters."
          actions={
            <Button variant="secondary" onClick={() => dispatch(clearShipmentFilters())}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")} aria-busy={isFetching}>
          <DataTable caption="Shipments" className="hidden md:block" columns={columns} rows={rows} getRowId={(s) => s.id} loading={isLoading} skeletonRows={6} />
          <ul className="flex flex-col gap-3 md:hidden">
            {isLoading || !rows
              ? Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="rounded-card border border-line bg-surface p-4">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="mt-3 h-3 w-2/3" />
                    <Skeleton className="mt-3 h-5 w-24" />
                  </li>
                ))
              : rows.map((s) => (
                  <li key={s.id} className="rounded-card border border-line bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button type="button" onClick={() => dispatch(openShipment(s.id))} className="font-mono text-sm font-medium text-ink">
                          {s.id}
                        </button>
                        <p className="truncate text-xs text-muted">
                          {s.orderId} · {s.websiteName}
                        </p>
                      </div>
                      <StatusBadge value={s.status} map={SHIPMENT_STATUS} />
                    </div>
                    <div className="mt-3 flex items-center gap-2.5">
                      <DeliveryMark type={s.methodType} carrier={s.carrier} size="sm" />
                      <div className="min-w-0 text-sm">
                        <p className="truncate text-ink">
                          {s.customerName} · {s.destination.city}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {s.methodName} · {s.carrier === "Self" ? "Your own staff" : s.carrier}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {tracking(s)}
                      <span className="text-xs text-muted tabular-nums">{formatRelative(s.updatedAt, now)}</span>
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
          pageSizeOptions={SHIPMENT_PAGE_SIZES}
          itemLabel={data.meta.total === 1 ? "shipment" : "shipments"}
          disabled={isFetching}
          onPageChange={(p) => dispatch(setShipmentPage(p))}
          onPageSizeChange={(n) => dispatch(setShipmentPageSize(n))}
        />
      )}

      <ShipmentDrawer />
      <ReturnShipmentDialog />
    </>
  );
}
