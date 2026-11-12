"use client";

import { useCallback } from "react";
import { LayoutGrid, Plus, Rows3 } from "lucide-react";
import Link from "next/link";
import { Alert } from "@/components/platform/Alert";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { FilterSelect } from "@/components/platform/FilterSelect";
import { PageHeader } from "@/components/platform/PageHeader";
import { Pagination } from "@/components/platform/Pagination";
import { SearchInput } from "@/components/platform/SearchInput";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useGetLicenseQuery } from "@/features/account/api";
import { selectLicense, selectLimitReached } from "@/features/account/slice";
import { pushToast } from "@/features/ui/slice";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetWebsitesQuery } from "../api";
import { PAGE_SIZE_OPTIONS, STATUS_OPTIONS, TYPE_OPTIONS } from "../constants";
import {
  clearFilters,
  openCreateDrawer,
  openEditDrawer,
  requestDelete,
  selectHasActiveFilters,
  selectPendingDeleteId,
  selectWebsiteFilters,
  selectWebsitesView,
  setPage,
  setPageSize,
  setSearch,
  setStatusFilter,
  setTypeFilter,
  setView,
} from "../slice";
import type { Website } from "../types";
import { WebsiteCard, WebsiteCardSkeleton } from "./WebsiteCard";
import { WebsitesTable } from "./WebsitesTable";

export function WebsitesPage() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectWebsiteFilters);
  const view = useAppSelector(selectWebsitesView);
  const hasFilters = useAppSelector(selectHasActiveFilters);
  const pendingDeleteId = useAppSelector(selectPendingDeleteId);
  const license = useAppSelector(selectLicense);
  const limitReached = useAppSelector(selectLimitReached);

  useGetLicenseQuery(); // seeds the license snapshot in the account slice
  const { data, isLoading, isFetching, isError, refetch } = useGetWebsitesQuery(filters);

  const onSearch = useCallback((v: string) => dispatch(setSearch(v)), [dispatch]);
  const onEdit = useCallback((id: string) => dispatch(openEditDrawer(id)), [dispatch]);
  const onDelete = useCallback((id: string) => dispatch(requestDelete(id)), [dispatch]);
  const onOpenAdmin = useCallback(
    (w: Website) => dispatch(pushToast({ tone: "info", title: `Admin for ${w.name}`, description: "The per-website admin panel is the next phase." })),
    [dispatch],
  );

  const websites = data?.data;
  const totalAll = data?.meta.counts.all ?? 0;
  const noWebsitesAtAll = !isLoading && !isError && totalAll === 0 && !hasFilters;
  const noResults = !isLoading && !isError && websites?.length === 0 && hasFilters;

  const newButton = (
    <Button
      leftIcon={<Plus className="size-4" />}
      onClick={() => dispatch(openCreateDrawer())}
      disabled={limitReached}
      title={limitReached ? "Your license includes no more websites. Delete a website to create a new one." : undefined}
    >
      New website
    </Button>
  );

  return (
    <>
      <PageHeader title="Websites" description="Create and manage your websites." actions={newButton} />

      {limitReached && license && (
        <Alert tone="info" className="mb-5">
          Your license includes {license.allowance} {license.allowance === 1 ? "website" : "websites"} and {license.allowance === 1 ? "it’s" : "they’re"} in use. Delete a website to create a new one.
        </Alert>
      )}

      {noWebsitesAtAll ? (
        <EmptyState
          illustration="websites"
          title="Create your first website"
          description="Start from a ready-made template. You can change everything later."
          actions={
            <>
              <Button leftIcon={<Plus className="size-4" />} onClick={() => dispatch(openCreateDrawer())}>
                New website
              </Button>
              <Link href="/templates" className="inline-flex h-9 items-center justify-center rounded-md border border-line-strong bg-surface px-3.5 text-sm font-medium hover:bg-subtle">
                Browse templates
              </Link>
            </>
          }
        />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput value={filters.search} onChange={onSearch} placeholder="Search websites" />
            <div className="flex flex-col gap-3 sm:flex-row">
              <FilterSelect label="Filter by status" value={filters.status} options={STATUS_OPTIONS} onChange={(v) => dispatch(setStatusFilter(v))} />
              <FilterSelect label="Filter by type" value={filters.type} options={TYPE_OPTIONS} onChange={(v) => dispatch(setTypeFilter(v))} />
            </div>
            {hasFilters && (
              <button type="button" onClick={() => dispatch(clearFilters())} className="self-start text-sm font-medium text-primary hover:underline lg:self-center">
                Clear filters
              </button>
            )}
            <div className="flex items-center gap-4 lg:ml-auto">
              {license && (
                <p className="text-xs text-muted tabular-nums">
                  {license.used} of {license.allowance} websites used
                </p>
              )}
              <SegmentedControl
                ariaLabel="Layout"
                value={view}
                onChange={(v) => dispatch(setView(v))}
                options={[
                  { value: "grid", ariaLabel: "Grid view", label: <LayoutGrid className="size-4" /> },
                  { value: "table", ariaLabel: "Table view", label: <Rows3 className="size-4" /> },
                ]}
              />
            </div>
          </div>

          {isError ? (
            <ErrorState title="We couldn’t load your websites" onRetry={refetch} retrying={isFetching} />
          ) : noResults ? (
            <EmptyState
              illustration="no-results"
              title="No websites match your filters"
              description="Try a different search or clear the filters."
              actions={
                <Button variant="secondary" onClick={() => dispatch(clearFilters())}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")} aria-busy={isFetching}>
              {view === "grid" ? (
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {isLoading
                    ? Array.from({ length: filters.pageSize > 6 ? 6 : filters.pageSize }, (_, i) => <WebsiteCardSkeleton key={i} />)
                    : websites?.map((w) => (
                        <WebsiteCard key={w.id} website={w} onEdit={onEdit} onDelete={onDelete} onOpenAdmin={onOpenAdmin} deleting={pendingDeleteId === w.id} />
                      ))}
                </div>
              ) : (
                <WebsitesTable rows={websites} loading={isLoading} onEdit={onEdit} onDelete={onDelete} onOpenAdmin={onOpenAdmin} />
              )}
            </div>
          )}

          {data && !isError && (
            <Pagination
              className="mt-6"
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              pageSize={data.meta.pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              itemLabel="websites"
              disabled={isFetching}
              onPageChange={(p) => dispatch(setPage(p))}
              onPageSizeChange={(n) => dispatch(setPageSize(n))}
            />
          )}
        </>
      )}
    </>
  );
}
