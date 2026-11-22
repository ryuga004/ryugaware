/**
 * Pictures a customer has chosen but not yet saved.
 *
 * A picture picked in the editor is held in the draft as a data URL, which the preview renders
 * directly. Nothing reaches S3 until the customer saves: discarding the edit therefore leaves no
 * orphan in the bucket and costs the customer none of their storage allowance. On save, every data
 * URL in the draft is uploaded once and swapped for the URL the backend returns, so what is written
 * to the database is a link, never a base64 blob.
 */
import type { SiteContent } from "./types";

type Uploader = (file: File) => Promise<string>;

const EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

const isPending = (value: unknown): value is string => typeof value === "string" && value.startsWith("data:");

function eachString(value: unknown, visit: (value: string) => void): void {
  if (typeof value === "string") return visit(value);
  if (Array.isArray(value)) return value.forEach((item) => eachString(item, visit));
  if (value && typeof value === "object") Object.values(value).forEach((item) => eachString(item, visit));
}

function mapStrings(value: unknown, fn: (value: string) => string): unknown {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, fn));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapStrings(item, fn)]));
  }
  return value;
}

/** Every distinct picture in the draft that has not been uploaded yet. */
export function pendingAssets(site: SiteContent): string[] {
  const found = new Set<string>();
  eachString(site, (value) => {
    if (isPending(value)) found.add(value);
  });
  return [...found];
}

async function toFile(dataUrl: string, index: number): Promise<File> {
  const blob = await fetch(dataUrl).then((r) => r.blob());
  return new File([blob], `upload-${index + 1}${EXTENSION[blob.type] ?? ""}`, { type: blob.type || "application/octet-stream" });
}

/**
 * Uploads every pending picture and returns a copy of the draft pointing at the stored files.
 *
 * Each distinct picture is uploaded once however many sections use it, and `onProgress` reports
 * which one is in flight so the save button can say so. A failure propagates: the caller must not
 * save content that still holds a data URL.
 */
export async function commitAssets(
  site: SiteContent,
  upload: Uploader,
  onProgress?: (done: number, total: number) => void,
): Promise<SiteContent> {
  const pending = pendingAssets(site);
  if (pending.length === 0) return site;

  const uploaded = new Map<string, string>();
  for (const [index, dataUrl] of pending.entries()) {
    onProgress?.(index, pending.length);
    uploaded.set(dataUrl, await upload(await toFile(dataUrl, index)));
  }
  onProgress?.(pending.length, pending.length);

  return mapStrings(site, (value) => uploaded.get(value) ?? value) as SiteContent;
}
