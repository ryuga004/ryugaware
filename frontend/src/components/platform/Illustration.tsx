import Image from "next/image";
import { cn } from "@/lib/cn";

/** Empty / error illustrations generated for Ryugaware (public/images/empty). */
export type IllustrationName =
  | "websites"
  | "templates"
  | "error"
  | "no-results"
  | "storage"
  | "domains"
  | "payments"
  | "revenue"
  | "delivery"
  | "users"
  | "authentication"
  | "contact";

/** Decorative: the surrounding heading carries the meaning, so alt is empty. */
export function Illustration({ name, size = 140, className }: { name: IllustrationName; size?: number; className?: string }) {
  return <Image src={`/images/empty/${name}.webp`} alt="" width={size} height={size} className={cn("select-none", className)} />;
}
