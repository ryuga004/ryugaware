"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface TabNavItem {
  href: string;
  label: string;
  /** Optional count shown after the label. */
  count?: number;
}

/**
 * Route-based tabs (each tab is its own URL, so it can be linked, refreshed and prefetched).
 * Scrolls horizontally on small screens instead of wrapping.
 */
export function TabNav({ items, label, className }: { items: TabNavItem[]; label: string; className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className={cn("-mx-4 mb-6 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0", className)}>
      <ul className="flex min-w-max gap-6">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-10 items-center gap-2 border-b-2 text-sm font-medium transition-colors",
                  active ? "border-primary text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {item.label}
                {item.count !== undefined && (
                  <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-tint text-primary" : "bg-subtle text-muted")}>{item.count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
