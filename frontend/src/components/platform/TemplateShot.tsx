import Image from "next/image";
import { cn } from "@/lib/cn";
import { ThemeThumbnail } from "./ThemeThumbnail";

/** Themes that have a rendered homepage screenshot in public/images/templates. */
const SHOTS = new Set(["classic_store", "modern_boutique", "fresh_market", "studio_pro", "clinic_care", "bistro_table"]);

/**
 * Template / website preview: the real homepage screenshot (cropped from the top) inside a box of the
 * given aspect ratio, or the drawn ThemeThumbnail when the theme has no screenshot.
 */
export function TemplateShot({
  theme,
  alt = "",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  muted,
  preload,
  className,
}: {
  theme: string;
  alt?: string;
  sizes?: string;
  muted?: boolean;
  preload?: boolean;
  className?: string;
}) {
  if (!SHOTS.has(theme)) return <ThemeThumbnail theme={theme} muted={muted} className={cn("aspect-[16/10] object-cover", className)} />;
  return (
    <div className={cn("relative aspect-[16/10] w-full overflow-hidden bg-subtle", className)}>
      <Image
        src={`/images/templates/${theme}.webp`}
        alt={alt}
        fill
        sizes={sizes}
        preload={preload}
        className={cn("object-cover object-top", muted && "opacity-40 grayscale")}
      />
    </div>
  );
}
