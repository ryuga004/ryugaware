"use client";

import { useCallback } from "react";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { PageHeader } from "@/components/platform/PageHeader";
import { Pagination } from "@/components/platform/Pagination";
import { SearchInput } from "@/components/platform/SearchInput";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useGetLicenseQuery } from "@/features/account/api";
import { selectLicense, selectLimitReached } from "@/features/account/slice";
import { openCreateDrawer } from "@/features/websites/slice";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetTemplatesQuery } from "../api";
import {
  clearTemplateFilters,
  openTemplatePreview,
  selectTemplateCategories,
  selectTemplateFilters,
  setTemplateCategory,
  setTemplatePage,
  setTemplateSearch,
} from "../slice";
import type { TemplateCategory } from "../types";
import { TemplateCard, TemplateCardSkeleton } from "./TemplateCard";

export function TemplatesPage() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectTemplateFilters);
  const categories = useAppSelector(selectTemplateCategories);
  const license = useAppSelector(selectLicense);
  const limitReached = useAppSelector(selectLimitReached);

  useGetLicenseQuery();
  const { data, isLoading, isFetching, isError, refetch } = useGetTemplatesQuery(filters);

  const onSearch = useCallback((v: string) => dispatch(setTemplateSearch(v)), [dispatch]);
  const limitReason = limitReached
    ? `Your license includes ${license?.allowance ?? ""} ${license?.allowance === 1 ? "website" : "websites"} and ${license?.allowance === 1 ? "it’s" : "they’re"} in use.`
    : undefined;

  return (
    <>
      <PageHeader title="Templates" description="Ready-made starting points. Everything can be customized after you create a website." />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={filters.search} onChange={onSearch} placeholder="Search templates" />
        {categories.length > 0 && (
          <div className="max-w-full overflow-x-auto">
            <SegmentedControl<TemplateCategory | "all">
              ariaLabel="Category"
              value={filters.category}
              onChange={(v) => dispatch(setTemplateCategory(v))}
              options={categories.map((c) => ({ value: c.id, label: `${c.label} · ${c.count}` }))}
            />
          </div>
        )}
      </div>

      {isError ? (
        <ErrorState title="We couldn’t load templates" onRetry={refetch} retrying={isFetching} />
      ) : !isLoading && data?.data.length === 0 ? (
        <EmptyState
          illustration="templates"
          title="No templates match your search"
          description="Try a different search or clear the filters."
          actions={
            <Button variant="secondary" onClick={() => dispatch(clearTemplateFilters())}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className={cn("grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3 transition-opacity", isFetching && !isLoading && "opacity-60")}>
          {isLoading
            ? Array.from({ length: 6 }, (_, i) => <TemplateCardSkeleton key={i} />)
            : data?.data.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  useDisabledReason={limitReason}
                  onPreview={(id) => dispatch(openTemplatePreview(id))}
                  onUse={(id) => dispatch(openCreateDrawer({ templateId: id }))}
                />
              ))}
        </div>
      )}

      {data && !isError && (
        <Pagination
          className="mt-6"
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          pageSize={data.meta.pageSize}
          itemLabel="templates"
          disabled={isFetching}
          onPageChange={(p) => dispatch(setTemplatePage(p))}
        />
      )}
    </>
  );
}
