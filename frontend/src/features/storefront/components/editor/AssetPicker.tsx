"use client";

import { Modal } from "@/components/platform/Modal";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useGetWebsiteAssetsQuery } from "@/features/storage/api";
import { formatBytes } from "@/features/storage/format";
import type { AssetFile } from "@/features/storage/types";
import { cn } from "@/lib/cn";

/**
 * Pick a picture this website has already uploaded, instead of uploading it a second time.
 *
 * It reads the same listing the Storage screen uses, filtered to images, and shows the website's
 * folder and its subfolders together — nothing is hidden behind a click, because every upload lands
 * in one folder and a picker that made you find it would be a picker you fight.
 */
export function AssetPicker({
  open,
  websiteId,
  value,
  onClose,
  onSelect,
}: {
  open: boolean;
  websiteId: string;
  value: string | null;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const { data, isLoading, isError, refetch } = useGetWebsiteAssetsQuery({ websiteId, path: "" }, { skip: !open });

  const rootImages = (data?.files ?? []).filter((f) => f.contentType.startsWith("image/"));

  return (
    <Modal open={open} onClose={onClose} title="Choose a picture" description="Files already uploaded for this website." size="lg">
      <div className="flex flex-col gap-6 px-6 py-5">
        {isError ? (
          <ErrorState title="We couldn’t load your files" onRetry={refetch} />
        ) : isLoading || !data ? (
          <Grid>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </Grid>
        ) : rootImages.length === 0 && data.folders.length === 0 ? (
          <EmptyState
            illustration="storage"
            compact
            title="No pictures yet"
            description="Upload one with the button on this field and it will appear here for every other picture field."
          />
        ) : (
          <>
            {rootImages.length > 0 && <Tiles files={rootImages} value={value} onPick={onSelect} onClose={onClose} />}
            {data.folders.map((folder) => (
              <FolderGroup
                key={folder.path}
                websiteId={websiteId}
                path={folder.path}
                name={folder.name}
                value={value}
                onPick={onSelect}
                onClose={onClose}
              />
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}

/** One subfolder's pictures, fetched with the picker rather than after a click. */
function FolderGroup({
  websiteId,
  path,
  name,
  value,
  onPick,
  onClose,
}: {
  websiteId: string;
  path: string;
  name: string;
  value: string | null;
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const { data, isLoading } = useGetWebsiteAssetsQuery({ websiteId, path });
  const images = (data?.files ?? []).filter((f) => f.contentType.startsWith("image/"));

  if (isLoading) {
    return (
      <section>
        <Heading>{name}</Heading>
        <Grid>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </Grid>
      </section>
    );
  }

  if (images.length === 0) return null;

  return (
    <section>
      <Heading>{name}</Heading>
      <Tiles files={images} value={value} onPick={onPick} onClose={onClose} />
    </section>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">{children}</h3>;
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{children}</div>;
}

function Tiles({
  files,
  value,
  onPick,
  onClose,
}: {
  files: AssetFile[];
  value: string | null;
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {files.map((file) => {
        const chosen = file.url === value;
        return (
          <li key={file.key}>
            <button
              type="button"
              aria-pressed={chosen}
              onClick={() => {
                onPick(file.url);
                onClose();
              }}
              className={cn(
                "flex w-full flex-col overflow-hidden rounded-card border bg-surface text-left transition-colors",
                chosen ? "border-primary ring-[3px] ring-ember/20" : "border-line hover:border-line-strong",
              )}
            >
              <span className="flex aspect-square w-full items-center justify-center overflow-hidden bg-subtle">
                {/* Customer uploads live in S3, which the image optimiser is not configured to serve. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.url} alt="" loading="lazy" className="size-full object-cover" />
              </span>
              <span className="min-w-0 px-2.5 py-2">
                <span className="block truncate text-xs font-medium text-ink">{file.name}</span>
                <span className="block text-xs text-muted tabular-nums">{formatBytes(file.size)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
