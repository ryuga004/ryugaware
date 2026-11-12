"use client";

import { useCallback } from "react";
import Image from "next/image";
import { EllipsisVertical, Plus, RefreshCw, Star, Trash2, Waypoints } from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/platform/ActionMenu";
import { DataTable, type Column } from "@/components/platform/DataTable";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { FilterSelect } from "@/components/platform/FilterSelect";
import { PageHeader } from "@/components/platform/PageHeader";
import { Pagination } from "@/components/platform/Pagination";
import { SearchInput } from "@/components/platform/SearchInput";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { WebsiteSelect } from "@/features/websites/components/WebsiteSelect";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetDomainsQuery, useMakePrimaryDomainMutation, useVerifyDomainMutation } from "../api";
import { DOMAIN_PAGE_SIZES, DOMAIN_STATUS, DOMAIN_STATUS_OPTIONS, SSL_STATUS } from "../constants";
import {
  clearDomainFilters,
  openAddDomain,
  openDnsDrawer,
  requestRemoveDomain,
  selectDomainFilters,
  selectDomainHasFilters,
  setDomainPage,
  setDomainPageSize,
  setDomainSearch,
  setDomainStatus,
  setDomainWebsite,
} from "../slice";
import type { Domain } from "../types";
import { AddDomainDrawer } from "./AddDomainDrawer";
import { DnsDrawer } from "./DnsDrawer";
import { RemoveDomainDialog } from "./RemoveDomainDialog";

export function DomainsPage() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectDomainFilters);
  const hasFilters = useAppSelector(selectDomainHasFilters);
  const { data, isLoading, isFetching, isError, refetch } = useGetDomainsQuery(filters);
  const [verify, verifyState] = useVerifyDomainMutation();
  const [makePrimary] = useMakePrimaryDomainMutation();

  const onSearch = useCallback((v: string) => dispatch(setDomainSearch(v)), [dispatch]);
  const verifyingId = verifyState.isLoading ? verifyState.originalArgs : undefined;

  const rows = data?.data;
  const noDomainsAtAll = !isLoading && !isError && data?.meta.counts.all === 0;
  const noResults = !isLoading && !isError && rows?.length === 0 && hasFilters;
  const needsAction = data ? data.meta.counts.pending_dns + data.meta.counts.failed : 0;

  const menuItems = (d: Domain): ActionMenuItem[] => [
    { key: "dns", label: "View DNS records", icon: <Waypoints className="size-4" />, onSelect: () => dispatch(openDnsDrawer(d.id)) },
    ...(d.status === "active" && !d.primary
      ? [{ key: "primary", label: "Make primary", icon: <Star className="size-4" />, onSelect: () => makePrimary(d.id) }]
      : []),
    { key: "remove", label: "Remove domain", icon: <Trash2 className="size-4" />, tone: "danger", separated: true, onSelect: () => dispatch(requestRemoveDomain(d.id)) },
  ];

  const verifyButton = (d: Domain, full?: boolean) =>
    d.status !== "active" && (
      <Button size="sm" variant="secondary" fullWidth={full} loading={verifyingId === d.id} leftIcon={<RefreshCw className="size-3.5" />} onClick={() => verify(d.id)}>
        {d.status === "verifying" ? "Check again" : "Verify now"}
      </Button>
    );

  const columns: Column<Domain>[] = [
    {
      key: "domain",
      header: "Domain",
      cell: (d) => (
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={() => dispatch(openDnsDrawer(d.id))} className="truncate font-medium text-ink hover:underline">
            {d.hostname}
          </button>
          {d.primary && <Badge tone="ink">Primary</Badge>}
        </div>
      ),
    },
    { key: "website", header: "Website", cell: (d) => <span className="text-body">{d.websiteName}</span> },
    { key: "status", header: "Status", cell: (d) => <StatusBadge value={d.status} map={DOMAIN_STATUS} /> },
    { key: "ssl", header: "SSL", cell: (d) => <StatusBadge value={d.ssl} map={SSL_STATUS} /> },
    { key: "added", header: "Added", cell: (d) => <span className="text-muted tabular-nums">{formatDate(d.createdAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      className: "w-[180px]",
      cell: (d) => (
        <div className="flex items-center justify-end gap-1">
          {verifyButton(d)}
          <ActionMenu
            trigger={
              <IconButton label={`Actions for ${d.hostname}`}>
                <EllipsisVertical className="size-4" />
              </IconButton>
            }
            items={menuItems(d)}
          />
        </div>
      ),
    },
  ];

  const addButton = (
    <Button leftIcon={<Plus className="size-4" />} onClick={() => dispatch(openAddDomain())}>
      Add domain
    </Button>
  );

  return (
    <>
      <PageHeader title="Domains" description="Connect web addresses you own to your websites." actions={!noDomainsAtAll && addButton} />

      {noDomainsAtAll ? (
        <EmptyState
          illustration="domains"
          title="Use your own web address"
          description="Every website already has a free ryugaware.com address. Connect a domain you own, like shop.yourbrand.com, and we’ll handle the SSL certificate."
          actions={addButton}
        >
          <Image src="/images/domains/dns-steps.webp" alt="Three steps: add your domain, add the DNS records at your registrar, and we verify it and issue SSL" width={1600} height={400} className="mt-8 h-auto w-full max-w-2xl" />
        </EmptyState>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput value={filters.search} onChange={onSearch} placeholder="Search domains" />
            <div className="flex flex-col gap-3 sm:flex-row">
              <FilterSelect label="Filter by status" value={filters.status} options={DOMAIN_STATUS_OPTIONS} onChange={(v) => dispatch(setDomainStatus(v))} />
              <WebsiteSelect value={filters.websiteId} onChange={(v) => dispatch(setDomainWebsite(v))} label="Filter by website" className="sm:w-48" />
            </div>
            {hasFilters && (
              <button type="button" onClick={() => dispatch(clearDomainFilters())} className="self-start text-sm font-medium text-primary hover:underline lg:self-center">
                Clear filters
              </button>
            )}
            {needsAction > 0 && (
              <button
                type="button"
                onClick={() => dispatch(setDomainStatus("pending_dns"))}
                className="self-start text-xs font-medium text-warning-text hover:underline lg:ml-auto lg:self-center"
              >
                {needsAction} {needsAction === 1 ? "domain needs" : "domains need"} DNS changes
              </button>
            )}
          </div>

          {isError ? (
            <ErrorState title="We couldn’t load your domains" onRetry={refetch} retrying={isFetching} />
          ) : noResults ? (
            <EmptyState
              illustration="no-results"
              title="No domains match your filters"
              description="Try a different search or clear the filters."
              actions={
                <Button variant="secondary" onClick={() => dispatch(clearDomainFilters())}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")} aria-busy={isFetching}>
              <DataTable caption="Domains" className="hidden md:block" columns={columns} rows={rows} getRowId={(d) => d.id} loading={isLoading} skeletonRows={5} />
              {/* Mobile: cards instead of a sideways-scrolling table. */}
              <ul className="flex flex-col gap-3 md:hidden">
                {isLoading || !rows
                  ? Array.from({ length: 4 }, (_, i) => (
                      <li key={i} className="rounded-card border border-line bg-surface p-4">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="mt-3 h-3 w-1/3" />
                      </li>
                    ))
                  : rows.map((d) => (
                      <li key={d.id} className="rounded-card border border-line bg-surface p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <button type="button" onClick={() => dispatch(openDnsDrawer(d.id))} className="block max-w-full truncate text-left font-medium text-ink">
                              {d.hostname}
                            </button>
                            <p className="mt-0.5 text-xs text-muted">{d.websiteName}</p>
                          </div>
                          <ActionMenu
                            trigger={
                              <IconButton label={`Actions for ${d.hostname}`}>
                                <EllipsisVertical className="size-4" />
                              </IconButton>
                            }
                            items={menuItems(d)}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {d.primary && <Badge tone="ink">Primary</Badge>}
                          <StatusBadge value={d.status} map={DOMAIN_STATUS} />
                          <span className="text-xs text-muted">SSL {SSL_STATUS[d.ssl].label.toLowerCase()}</span>
                        </div>
                        {d.status !== "active" && <div className="mt-3">{verifyButton(d, true)}</div>}
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
              pageSizeOptions={DOMAIN_PAGE_SIZES}
              itemLabel="domains"
              disabled={isFetching}
              onPageChange={(p) => dispatch(setDomainPage(p))}
              onPageSizeChange={(n) => dispatch(setDomainPageSize(n))}
            />
          )}
        </>
      )}

      <AddDomainDrawer />
      <DnsDrawer />
      <RemoveDomainDialog />
    </>
  );
}
