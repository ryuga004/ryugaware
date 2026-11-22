"use client";

import { useRef, useState } from "react";
import NextImage from "next/image";
import { ImagePlus, Images, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const MAX_BYTES = 512 * 1024;

/**
 * Picture field for customer-supplied images (logo, section artwork).
 *
 * With `upload`, the file goes to the website's own storage prefix and the returned URL is stored.
 * Without one — the create wizard, where no website exists yet — it falls back to a data URL.
 *
 * `onBrowse` adds a second way in: pick a picture the website has already uploaded, so the same hero
 * image can be reused across sections instead of being uploaded again.
 */
export function ImageUpload({
  value,
  onChange,
  id,
  label = "Upload image",
  hint,
  onError,
  upload,
  onBrowse,
  className,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  id?: string;
  label?: string;
  hint?: string;
  onError?: (message: string) => void;
  /** Uploads the file and resolves to its URL. Omit to keep the image inline as a data URL. */
  upload?: (file: File) => Promise<string>;
  /** Opens a picker of pictures this website already has. Omit where there is nothing to browse. */
  onBrowse?: () => void;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return onError?.("Choose an image file.");
    if (file.size > MAX_BYTES) return onError?.("Images must be 512 KB or smaller.");

    if (upload) {
      setBusy(true);
      try {
        onChange(await upload(file));
      } catch {
        onError?.("We couldn’t upload that image.");
      } finally {
        setBusy(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => onError?.("We couldn’t read that file.");
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-card border border-line bg-subtle">
        {value ? (
          <Preview src={value} />
        ) : (
          <ImagePlus className="size-6 text-faint" aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <input
          ref={input}
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" loading={busy} onClick={() => input.current?.click()}>
            {busy ? "Uploading…" : value ? "Replace" : label}
          </Button>
          {onBrowse && !busy && (
            <Button variant="ghost" size="sm" leftIcon={<Images className="size-4" />} onClick={onBrowse}>
              Choose existing
            </Button>
          )}
          {value && !busy && (
            <Button variant="ghost" size="sm" leftIcon={<Trash2 className="size-4" />} onClick={() => onChange(null)}>
              Remove
            </Button>
          )}
        </div>
        {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

function Preview({ src }: { src: string }) {
  // The optimiser is configured for /images/** only (next.config.ts), so a customer upload — a data
  // URL in the create wizard, an S3 URL once the website exists — has to be rendered directly.
  if (!src.startsWith("/images/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("size-full", src.startsWith("data:") ? "object-contain p-2" : "object-cover")} />;
  }
  return <NextImage src={src} alt="" width={80} height={80} className="size-full object-cover" />;
}
