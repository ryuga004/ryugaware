import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ dark, markOnly, className }: { dark?: boolean; markOnly?: boolean; className?: string }) {
  return (
    <Link href="/websites" aria-label="Ryugaware home" className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="font-logo flex size-7 items-center justify-center rounded-[7px] bg-ember text-[15px] leading-none font-bold text-ink">R</span>
      {!markOnly && (
        <span className={cn("font-logo text-sm font-bold tracking-[0.09em]", dark ? "text-page" : "text-ink")}>RYUGAWARE</span>
      )}
    </Link>
  );
}
