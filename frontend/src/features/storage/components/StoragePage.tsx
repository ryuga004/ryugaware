"use client";

import { useRef, useState } from "react";
import { ChevronRight, File as FileIcon, Folder, HardDrive, Trash2, Upload } from "lucide-react";
import { ConfirmDialog } from "@/components/platform/ConfirmDialog";
import { DataTable, type Column } from "@/components/platform/DataTable";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { PageHeader } from "@/components/platform/PageHeader";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { pushToast } from "@/features/ui/slice";
import { useUploadAssetMutation } from "@/features/websites/api";
import { formatDate, pluralize } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useAppDispatch } from "@/store/hooks";
import { useDeleteAssetMutation, useGetStorageQuery, useGetWebsiteAssetsQuery } from "../api";
import { formatBytes } from "../format";
import type { AssetFile } from "../types";

/** A row in the explorer: a website's folder, a folder inside it, or a file. */
type Entry =
  | { kind: "website"; id: string; name: string; bytes: number; objects: number }
  | { kind: "folder"; id: string; name: string; path: string; bytes: number; objects: number }
  | { kind: "file"; id: string; name: string; file: AssetFile };

interface Crumb {
  label: string;
  /** Where this crumb goes back to. */
  websiteId: string | null;
  path: string;
}

/**
 * Ryugaware storage, browsed like a file manager.
 *
 * The root lists one folder per website — that is what the bucket actually holds, a prefix each.
 * Opening one walks into it a level at a time, which is also how the backend returns it, so a large
 * bucket is never loaded whole. Breadcrumbs walk back out.
 */
export function StoragePage() {
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [path, setPath] = useState("");

  const storage = useGetStorageQuery();
  const folder = useGetWebsiteAssetsQuery({ websiteId: websiteId ?? "", path }, { skip: websiteId === null });

  const website = storage.data?.websites.find((w) => w.websiteId === websiteId) ?? null;
  const inside = websiteId !== null;

  const open = (next: { websiteId: string | null; path: string }) => {
    setWebsiteId(next.websiteId);
    setPath(next.path);
  };

  const crumbs: Crumb[] = [
    { label: "Storage", websiteId: null, path: "" },
    ...(website ? [{ label: website.name, websiteId: website.websiteId, path: "" }] : []),
    ...path
      .split("/")
      .filter(Boolean)
      .map((name, i, all) => ({
        label: name,
        websiteId,
        path: all.slice(0, i + 1).join("/") + "/",
      })),
  ];

  const loading = inside ? folder.isLoading : storage.isLoading;
  const fetching = inside ? folder.isFetching : storage.isFetching;
  const error = inside ? folder.isError : storage.isError;
  const refetch = inside ? folder.refetch : storage.refetch;

  const entries: Entry[] = inside
    ? [
        ...(folder.data?.folders ?? []).map(
          (f): Entry => ({ kind: "folder", id: f.path, name: f.name, path: f.path, bytes: f.bytes, objects: f.objects }),
        ),
        ...(folder.data?.files ?? []).map((f): Entry => ({ kind: "file", id: f.key, name: f.name, file: f })),
      ]
    : (storage.data?.websites ?? []).map(
        (w): Entry => ({ kind: "website", id: w.websiteId, name: w.name, bytes: w.bytes, objects: w.objects }),
      );

  return (
    <Explorer
      crumbs={crumbs}
      entries={entries}
      websiteId={websiteId}
      websiteName={website?.name ?? null}
      used={storage.data ? `${formatBytes(storage.data.bytesUsed)} of ${formatBytes(storage.data.quotaBytes)} used` : undefined}
      loading={loading}
      fetching={fetching}
      error={error}
      onRetry={refetch}
      onOpen={open}
    />
  );
}

function Explorer({
  crumbs,
  entries,
  websiteId,
  websiteName,
  used,
  loading,
  fetching,
  error,
  onRetry,
  onOpen,
}: {
  crumbs: Crumb[];
  entries: Entry[];
  websiteId: string | null;
  websiteName: string | null;
  used: string | undefined;
  loading: boolean;
  fetching: boolean;
  error: boolean;
  onRetry: () => void;
  onOpen: (next: { websiteId: string | null; path: string }) => void;
}) {
  const dispatch = useAppDispatch();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AssetFile | null>(null);
  const [deleteAsset, { isLoading: deleting }] = useDeleteAssetMutation();
  const [upload, { isLoading: uploading }] = useUploadAssetMutation();

  const onPick = async (file: File | undefined) => {
    if (!file || !websiteId) return;
    await upload({ websiteId, file })
      .unwrap()
      .then(() => {
        // Uploads always land in the website's `media/` folder, so go and show the file there.
        onOpen({ websiteId, path: "media/" });
        dispatch(pushToast({ tone: "success", title: `${file.name} uploaded`, description: "Saved to media" }));
      })
      .catch(() => null);
  };

  const columns: Column<Entry>[] = [
    {
      key: "name",
      header: "Name",
      cell: (entry) => <NameCell entry={entry} onOpen={onOpen} websiteId={websiteId} />,
      className: "max-w-[420px]",
    },
    {
      key: "type",
      header: "Type",
      cell: (entry) => <span className="text-muted">{typeLabel(entry)}</span>,
    },
    {
      key: "size",
      header: "Size",
      align: "right",
      cell: (entry) => <span className="text-ink tabular-nums">{formatBytes(sizeOf(entry))}</span>,
    },
    {
      key: "updated",
      header: "Updated",
      cell: (entry) => <span className="whitespace-nowrap text-muted">{entry.kind === "file" ? formatDate(entry.file.updatedAt) : "—"}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (entry) =>
        entry.kind === "file" ? (
          <IconButton label={`Delete ${entry.name}`} size="sm" danger onClick={() => setPending(entry.file)}>
            <Trash2 className="size-4" />
          </IconButton>
        ) : null,
    },
  ];

  const uploadButton = websiteId ? (
    <>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        onChange={(e) => {
          void onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button variant="secondary" loading={uploading} leftIcon={<Upload className="size-4" />} onClick={() => input.current?.click()}>
        {uploading ? "Uploading…" : "Upload file"}
      </Button>
    </>
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Storage"
        description={used ?? "Every website keeps its files in its own folder."}
        actions={uploadButton}
      />

      <Breadcrumbs crumbs={crumbs} onOpen={onOpen} />

      {error ? (
        <ErrorState title="We couldn’t open this folder" onRetry={onRetry} retrying={fetching} />
      ) : (
        <div className={cn(fetching && !loading && "opacity-60 transition-opacity")} aria-busy={fetching || undefined}>
          <div className="max-md:hidden">
            <DataTable
              caption={crumbs.map((c) => c.label).join(" / ")}
              columns={columns}
              rows={entries}
              getRowId={(e) => e.id}
              loading={loading}
              skeletonRows={5}
              emptyState={<Empty websiteId={websiteId} websiteName={websiteName} onUpload={() => input.current?.click()} />}
            />
          </div>

          <div className="md:hidden">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : entries.length === 0 ? (
              <Empty websiteId={websiteId} websiteName={websiteName} onUpload={() => input.current?.click()} />
            ) : (
              <ul className="flex flex-col gap-2">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 rounded-card border border-line bg-surface p-3">
                    <div className="min-w-0 flex-1">
                      <NameCell entry={entry} onOpen={onOpen} websiteId={websiteId} />
                      <p className="mt-1 pl-[30px] text-xs text-muted tabular-nums">
                        {typeLabel(entry)} · {formatBytes(sizeOf(entry))}
                      </p>
                    </div>
                    {entry.kind === "file" && (
                      <IconButton label={`Delete ${entry.name}`} size="sm" danger onClick={() => setPending(entry.file)}>
                        <Trash2 className="size-4" />
                      </IconButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Delete this file?"
        description={
          <>
            <span className="font-mono">{pending?.name}</span> will be removed from storage. Any page still using it
            will show a broken picture.
          </>
        }
        confirmLabel="Delete file"
        tone="danger"
        loading={deleting}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (!pending || !websiteId) return;
          await deleteAsset({ websiteId, key: pending.key, name: pending.name }).unwrap().catch(() => null);
          setPending(null);
        }}
      />
    </>
  );
}

function Breadcrumbs({ crumbs, onOpen }: { crumbs: Crumb[]; onOpen: (next: { websiteId: string | null; path: string }) => void }) {
  return (
    <nav aria-label="Folder path" className="mb-5 flex flex-wrap items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={`${crumb.websiteId ?? "root"}:${crumb.path}:${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />}
            {last ? (
              <span aria-current="page" className="font-medium text-ink">
                {crumb.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onOpen({ websiteId: crumb.websiteId, path: crumb.path })}
                className="font-medium text-muted transition-colors hover:text-ink"
              >
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function NameCell({
  entry,
  websiteId,
  onOpen,
}: {
  entry: Entry;
  websiteId: string | null;
  onOpen: (next: { websiteId: string | null; path: string }) => void;
}) {
  if (entry.kind === "file") {
    const image = entry.file.contentType.startsWith("image/");
    return (
      <div className="flex min-w-0 items-center gap-3">
        {image ? (
          <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-subtle">
            {/* Customer uploads live in S3, which the image optimiser is not configured to serve. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.file.url} alt="" loading="lazy" className="size-full object-cover" />
          </span>
        ) : (
          <FileIcon className="size-[18px] shrink-0 text-faint" aria-hidden />
        )}
        <a
          href={entry.file.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 truncate font-medium text-ink transition-colors hover:text-primary"
        >
          {entry.name}
        </a>
      </div>
    );
  }

  const target = entry.kind === "website" ? { websiteId: entry.id, path: "" } : { websiteId, path: entry.path };

  return (
    <button type="button" onClick={() => onOpen(target)} className="flex w-full min-w-0 items-center gap-3 text-left">
      <Folder className="size-[18px] shrink-0 text-muted" aria-hidden />
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink">{entry.name}</span>
        <span className="block truncate text-xs text-muted tabular-nums">{pluralize(entry.objects, "file")}</span>
      </span>
    </button>
  );
}

function Empty({ websiteId, websiteName, onUpload }: { websiteId: string | null; websiteName: string | null; onUpload: () => void }) {
  if (websiteId === null) {
    return (
      <EmptyState
        illustration="websites"
        title="No folders yet"
        description="Files belong to a website. Create one and its storage folder appears here, ready to upload into."
        actions={<ButtonLink href="/websites/new">New website</ButtonLink>}
      />
    );
  }
  return (
    <EmptyState
      illustration="storage"
      title="This folder is empty"
      description={`Nothing is stored here yet. Pictures you upload in ${websiteName ?? "the"} editor are kept in this folder.`}
      actions={
        <Button variant="secondary" leftIcon={<Upload className="size-4" />} onClick={onUpload}>
          Upload file
        </Button>
      }
    />
  );
}

const typeLabel = (entry: Entry) =>
  entry.kind === "file" ? entry.file.contentType : entry.kind === "website" ? "Website folder" : "Folder";

const sizeOf = (entry: Entry) => (entry.kind === "file" ? entry.file.size : entry.bytes);

export const StorageIcon = HardDrive;
