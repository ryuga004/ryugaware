"use client";

import { HardDrive } from "lucide-react";
import { DataTable, type Column } from "@/components/platform/DataTable";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { PageHeader } from "@/components/platform/PageHeader";
import { SettingsSection } from "@/components/platform/SettingsSection";
import { StatGrid, StatTile } from "@/components/platform/StatTile";
import { Skeleton } from "@/components/ui/Skeleton";
import { UsageBar } from "@/components/ui/UsageBar";
import { formatNumber, pluralize } from "@/lib/format";
import { useGetStorageQuery } from "../api";
import { formatBytes } from "../format";
import type { WebsiteStorage } from "../types";

export function StoragePage() {
  const { data, isLoading, isFetching, isError, refetch } = useGetStorageQuery();

  const columns: Column<WebsiteStorage>[] = [
    {
      key: "website",
      header: "Website",
      cell: (w: WebsiteStorage) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{w.name}</p>
          <p className="truncate font-mono text-xs text-muted">{w.prefix}</p>
        </div>
      ),
      className: "max-w-[420px]",
    },
    {
      key: "files",
      header: "Files",
      cell: (w: WebsiteStorage) => <span className="text-body tabular-nums">{formatNumber(w.objects)}</span>,
    },
    {
      key: "size",
      header: "Size",
      align: "right",
      cell: (w: WebsiteStorage) => <span className="text-ink tabular-nums">{formatBytes(w.bytes)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Storage"
        description="Every website gets its own space in Ryugaware storage. It is created with the website and removed with it."
      />

      {isError ? (
        <ErrorState title="We couldn’t load your storage" onRetry={refetch} retrying={isFetching} />
      ) : isLoading || !data ? (
        <div className="space-y-6">
          <StatGrid>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </StatGrid>
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="space-y-10">
          <StatGrid>
            <StatTile label="Used" value={formatBytes(data.bytesUsed)} />
            <StatTile label="Files" value={formatNumber(data.objects)} />
            <StatTile label="Included" value={formatBytes(data.quotaBytes)} />
          </StatGrid>

          <SettingsSection title="Allowance" description="What your licence includes.">
            <div className="flex flex-col gap-1.5">
              <UsageBar used={data.bytesUsed} total={data.quotaBytes} />
              <p className="text-xs text-muted tabular-nums">
                {formatBytes(data.bytesUsed)} of {formatBytes(data.quotaBytes)} used
              </p>
            </div>
          </SettingsSection>

          <SettingsSection title="By website" description="Where your files are stored.">
            {data.websites.length === 0 ? (
              <EmptyState
                illustration="websites"
                title="No storage yet"
                description="Create a website and its storage appears here automatically."
              />
            ) : (
              <>
                <div className="max-md:hidden">
                  <DataTable
                    caption="Storage used by each website"
                    columns={columns}
                    rows={data.websites}
                    getRowId={(w) => w.websiteId}
                  />
                </div>
                <ul className="flex flex-col gap-3 md:hidden">
                  {data.websites.map((w) => (
                    <li key={w.websiteId} className="rounded-card border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{w.name}</p>
                          <p className="truncate font-mono text-xs text-muted">{w.prefix}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-ink tabular-nums">{formatBytes(w.bytes)}</p>
                          <p className="text-xs text-muted tabular-nums">{pluralize(w.objects, "file")}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </SettingsSection>
        </div>
      )}
    </>
  );
}

export const StorageIcon = HardDrive;
