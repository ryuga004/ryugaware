"use client";

import { useRef } from "react";
import NextImage from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const MAX_BYTES = 512 * 1024;

/**
 * Picture field for customer-supplied images (logo, section artwork).
 *
 * In this demo the file is read into a data URL and kept with the website's content; a real build
 * would upload it to the storage module and keep the returned key instead.
 */
export function ImageUpload({
  value,
  onChange,
  id,
  label = "Upload image",
  hint,
  onError,
  className,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  id?: string;
  label?: string;
  hint?: string;
  onError?: (message: string) => void;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return onError?.("Choose an image file.");
    if (file.size > MAX_BYTES) return onError?.("Images must be 512 KB or smaller.");
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
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
            {value ? "Replace" : label}
          </Button>
          {value && (
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
  // Customer uploads arrive as data URLs, which the image optimiser does not accept.
  if (src.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="size-full object-contain p-2" />;
  }
  return <NextImage src={src} alt="" width={80} height={80} className="size-full object-cover" />;
}
