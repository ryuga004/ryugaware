"use client";

import { useCallback } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Ban, Download, EllipsisVertical, Globe, Mail, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/platform/ActionMenu";
import { DataTable, type Column } from "@/components/platform/DataTable";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { FilterSelect } from "@/components/platform/FilterSelect";
import { PageHeader } from "@/components/platform/PageHeader";
import { Pagination } from "@/components/platform/Pagination";
import { SearchInput } from "@/components/platform/SearchInput";
import { StatGrid, StatTile } from "@/components/platform/StatTile";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { WebsiteSelect } from "@/features/websites/components/WebsiteSelect";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney, formatNumber, formatRelative } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetCustomersQuery, useLazyExportCustomersQuery, useSetCustomerBlockedMutation } from "../api";
import { CUSTOMER_PAGE_SIZES, CUSTOMER_STATUS, CUSTOMER_STATUS_OPTIONS, SIGN_IN_LABEL, SIGN_IN_OPTIONS, SORT_OPTIONS } from "../constants";
import {
  clearCustomerFilters,
  openCustomer,
  requestBlockCustomer,
  requestDeleteCustomer,
  selectCustomerFilters,
  selectCustomerHasFilters,
  setCustomerPage,
  setCustomerPageSize,
  setCustomerSearch,
  setCustomerSignIn,
  setCustomerSort,
  setCustomerStatus,
  setCustomerWebsite,
  toggleCustomerSort,
} from "../slice";
import type { Customer, CustomerSort, CustomerSortKey } from "../types";
import { BlockCustomerDialog } from "./BlockCustomerDialog";
import { CustomerAvatar } from "./CustomerAvatar";
import { CustomerDrawer } from "./CustomerDrawer";
import { DeleteCustomerDialog } from "./DeleteCustomerDialog";

const SORT_LABEL: Record<CustomerSortKey, string> = { joined: "Joined", spent: "Total spent", lastActive: "Last active" };

export function CustomersPage() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectCustomerFilters);
  const hasFilters = useAppSelector(selectCustomerHasFilters);
  const { data, isLoading, isFetching, isError, refetch } = useGetCustomersQuery(filters);
  const [setBlocked] = useSetCustomerBlockedMutation();
  const [exportCsv, exportState] = useLazyExportCustomersQuery();

  const onSearch = useCallback((v: string) => dispatch(setCustomerSearch(v)), [dispatch]);

  const rows = data?.data;
  const counts = data?.meta.counts;
  const now = data?.meta.requestedAt ?? "";
  const nothingAtAll = !isLoading && !isError && counts?.all === 0;
  const noResults = !isLoading && !isError && rows?.length === 0 && hasFilters;

  const onExport = async () => {
    const { search, websiteId, status, signIn, sort } = filters;
    try {
      const file = await exportCsv({ search, websiteId, status, signIn, sort }).unwrap();
      const url = URL.createObjectURL(new Blob([file.csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* the endpoint shows the error toast */
    }
  };

  const menuItems = (c: Customer): ActionMenuItem[] => [
    { key: "view", label: "View details", icon: <UserRound className="size-4" />, onSelect: () => dispatch(openCustomer(c.id)) },
    { key: "email", label: "Send email", icon: <Mail className="size-4" />, href: `mailto:${c.email}` },
    c.status === "blocked"
      ? { key: "unblock", label: "Unblock user", icon: <ShieldCheck className="size-4" />, onSelect: () => setBlocked({ id: c.id, blocked: false }) }
      : { key: "block", label: "Block user", icon: <Ban className="size-4" />, onSelect: () => dispatch(requestBlockCustomer(c.id)) },
    { key: "delete", label: "Delete user", icon: <Trash2 className="size-4" />, tone: "danger", separated: true, onSelect: () => dispatch(requestDeleteCustomer(c.id)) },
  ];

  const menu = (c: Customer) => (
    <ActionMenu
      trigger={
        <IconButton label={`Actions for ${c.name}`}>
          <EllipsisVertical className="size-4" />
        </IconButton>
      }
      items={menuItems(c)}
    />
  );

  const sortHeader = (key: CustomerSortKey, align?: "right") => {
    const active = filters.sort.key === key;
    const Icon = !active ? ArrowUpDown : filters.sort.dir === "desc" ? ArrowDown : ArrowUp;
    return (
      <button
        type="button"
        onClick={() => dispatch(toggleCustomerSort(key))}
        aria-label={`Sort by ${SORT_LABEL[key].toLowerCase()}${active ? (filters.sort.dir === "desc" ? ", currently descending" : ", currently ascending") : ""}`}
        className={cn("inline-flex items-center gap-1 uppercase hover:text-ink", active && "text-ink", align === "right" && "flex-row-reverse")}
      >
        {SORT_LABEL[key]}
        <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden />
      </button>
    );
  };

  const signIn = (c: Customer) => (
    <span className="inline-flex items-center gap-1.5 text-body">
      {c.signInMethod === "google" ? <Globe className="size-4 text-muted" aria-hidden /> : <Mail className="size-4 text-muted" aria-hidden />}
      {SIGN_IN_LABEL[c.signInMethod]}
    </span>
  );

  const columns: Column<Customer>[] = [
    {
      key: "user",
      header: "User",
      cell: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          <CustomerAvatar customer={c} />
          <div className="min-w-0">
            <button type="button" onClick={() => dispatch(openCustomer(c.id))} className="block max-w-full truncate text-left font-medium text-ink hover:underline">
              {c.name}
            </button>
            <p className="max-w-[220px] truncate text-xs text-muted">{c.email}</p>
          </div>
        </div>
      ),
    },
    { key: "website", header: "Website", cell: (c) => <span className="text-body">{c.websiteName}</span> },
    { key: "signin", header: "Sign-in", cell: signIn },
    { key: "status", header: "Status", cell: (c) => <StatusBadge value={c.status} map={CUSTOMER_STATUS} /> },
    { key: "orders", header: "Orders", align: "right", cell: (c) => <span className="text-body tabular-nums">{formatNumber(c.orders)}</span> },
    { key: "spent", header: sortHeader("spent", "right"), align: "right", cell: (c) => <span className="font-medium text-ink tabular-nums">{formatMoney(c.totalSpent)}</span> },
    { key: "joined", header: sortHeader("joined"), cell: (c) => <span className="whitespace-nowrap text-body tabular-nums">{formatDate(c.joinedAt)}</span> },
    {
      key: "active",
      header: sortHeader("lastActive"),
      cell: (c) => <span className="whitespace-nowrap text-muted tabular-nums">{c.lastActiveAt ? formatRelative(c.lastActiveAt, now) : "Never"}</span>,
    },
    { key: "actions", header: <span className="sr-only">Actions</span>, align: "right", className: "w-[56px]", cell: menu },
  ];

  const sortValue = `${filters.sort.key}:${filters.sort.dir}` as const;

  return (
    <>
      <PageHeader
        title="Users"
        description="People who have signed up on your websites."
        actions={
          !nothingAtAll && (
            <Button variant="secondary" leftIcon={<Download className="size-4" />} loading={exportState.isFetching} disabled={isLoading || isError} onClick={onExport}>
              Export CSV
            </Button>
          )
        }
      />

      {nothingAtAll ? (
        <EmptyState
          illustration="users"
          title="No users yet"
          description="People who create an account on your websites will show up here. Turn on sign-in methods in Authentication to let customers register."
          actions={
            <>
              <ButtonLink href="/authentication" variant="secondary">
                Configure authentication
              </ButtonLink>
              <ButtonLink href="/websites" variant="secondary">
                View websites
              </ButtonLink>
            </>
          }
        />
      ) : (
        <>
          <StatGrid className="mb-6 lg:grid-cols-4 xl:grid-cols-4">
            <StatTile label="Total users" loading={!counts} value={counts && formatNumber(counts.all)} sub={counts && `+${formatNumber(counts.newLast30Days)} in the last 30 days`} />
            <StatTile label="Active" loading={!counts} value={counts && formatNumber(counts.active)} sub={counts && counts.all > 0 ? `${Math.round((counts.active / counts.all) * 100)}% of users` : undefined} />
            <StatTile label="Unverified" loading={!counts} value={counts && formatNumber(counts.unverified)} sub="Haven’t confirmed their email" />
            <StatTile label="Blocked" loading={!counts} value={counts && formatNumber(counts.blocked)} sub="Can’t sign in or order" />
          </StatGrid>

          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchInput value={filters.search} onChange={onSearch} placeholder="Search name or email" className="xl:w-64" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:flex">
              <WebsiteSelect value={filters.websiteId} onChange={(v) => dispatch(setCustomerWebsite(v))} label="Filter by website" className="xl:w-44" />
              <FilterSelect label="Filter by status" value={filters.status} options={CUSTOMER_STATUS_OPTIONS} onChange={(v) => dispatch(setCustomerStatus(v))} className="xl:w-36" />
              <FilterSelect label="Filter by sign-in method" value={filters.signIn} options={SIGN_IN_OPTIONS} onChange={(v) => dispatch(setCustomerSignIn(v))} className="xl:w-48" />
              <FilterSelect
                label="Sort users"
                value={sortValue}
                options={SORT_OPTIONS}
                onChange={(v) => {
                  const [key, dir] = v.split(":") as [CustomerSort["key"], CustomerSort["dir"]];
                  dispatch(setCustomerSort({ key, dir }));
                }}
                className="xl:w-48"
              />
            </div>
            {hasFilters && (
              <button type="button" onClick={() => dispatch(clearCustomerFilters())} className="self-start text-sm font-medium text-primary hover:underline xl:self-center">
                Clear filters
              </button>
            )}
          </div>

          {isError ? (
            <ErrorState title="We couldn’t load your users" onRetry={refetch} retrying={isFetching} />
          ) : noResults ? (
            <EmptyState
              illustration="no-results"
              title="No users match your filters"
              description="Try a different search or clear the filters."
              actions={
                <Button variant="secondary" onClick={() => dispatch(clearCustomerFilters())}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")} aria-busy={isFetching}>
              <DataTable caption="Users" className="hidden md:block" columns={columns} rows={rows} getRowId={(c) => c.id} loading={isLoading} skeletonRows={8} />
              <ul className="flex flex-col gap-3 md:hidden">
                {isLoading || !rows
                  ? Array.from({ length: 5 }, (_, i) => (
                      <li key={i} className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="mt-2 h-3 w-2/3" />
                        </div>
                      </li>
                    ))
                  : rows.map((c) => (
                      <li key={c.id} className="rounded-card border border-line bg-surface p-4">
                        <div className="flex items-start gap-3">
                          <CustomerAvatar customer={c} />
                          <div className="min-w-0 flex-1">
                            <button type="button" onClick={() => dispatch(openCustomer(c.id))} className="block max-w-full truncate text-left font-medium text-ink">
                              {c.name}
                            </button>
                            <p className="truncate text-xs text-muted">{c.email}</p>
                          </div>
                          {menu(c)}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
                          <StatusBadge value={c.status} map={CUSTOMER_STATUS} />
                          <span>{c.websiteName}</span>
                          <span>{SIGN_IN_LABEL[c.signInMethod]}</span>
                        </div>
                        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-sm">
                          <div>
                            <dt className="text-xs text-muted">Orders</dt>
                            <dd className="text-ink tabular-nums">{formatNumber(c.orders)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">Spent</dt>
                            <dd className="font-medium text-ink tabular-nums">{formatMoney(c.totalSpent)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">Last active</dt>
                            <dd className="text-ink tabular-nums">{c.lastActiveAt ? formatRelative(c.lastActiveAt, now) : "Never"}</dd>
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
              pageSizeOptions={CUSTOMER_PAGE_SIZES}
              itemLabel={data.meta.total === 1 ? "user" : "users"}
              disabled={isFetching}
              onPageChange={(p) => dispatch(setCustomerPage(p))}
              onPageSizeChange={(n) => dispatch(setCustomerPageSize(n))}
            />
          )}
        </>
      )}

      <CustomerDrawer />
      <BlockCustomerDialog />
      <DeleteCustomerDialog />
    </>
  );
}
