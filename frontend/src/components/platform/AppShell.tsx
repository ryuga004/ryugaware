"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Ellipsis, X } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { setMobileNavOpen } from "@/features/ui/slice";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { DemoDataSwitcher } from "./DemoDataSwitcher";
import { Logo } from "./Logo";
import { isActivePath, MOBILE_PRIMARY, NAV_GROUPS, NAV_ITEMS, titleForPath } from "./nav";
import { PlatformOverlays } from "./PlatformOverlays";
import { UserMenu } from "./UserMenu";

/**
 * Responsive application frame.
 *  - lg+      240px dark sidebar, grouped with section labels
 *  - md       64px icon rail, groups separated by dividers
 *  - <md      56px top bar + bottom tab bar (3 primary items + "More" sheet)
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const moreOpen = useAppSelector((s) => s.ui.mobileNavOpen);
  const primary = NAV_ITEMS.filter((i) => MOBILE_PRIMARY.includes(i.href));
  const moreActive = !primary.some((i) => isActivePath(pathname, i.href)) && NAV_ITEMS.some((i) => isActivePath(pathname, i.href));

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar / tablet rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col bg-ink md:flex lg:w-60">
        <div className="flex h-16 shrink-0 items-center px-[18px] lg:px-5">
          <Logo dark className="[&>span:last-child]:hidden lg:[&>span:last-child]:inline" />
        </div>
        <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className={cn(gi > 0 && "mt-3 border-t border-ink-800 pt-3 lg:mt-4 lg:border-0 lg:pt-0")}>
              <p className="hidden px-3 pb-1.5 text-[11px] font-medium tracking-[0.08em] text-on-dark/60 uppercase lg:block">{group.label}</p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = isActivePath(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        title={label}
                        className={cn(
                          "flex h-9 items-center justify-center gap-2.5 rounded-md text-sm font-medium transition-colors lg:justify-start lg:px-3",
                          active ? "bg-ink-800 text-page" : "text-on-dark hover:bg-ink-800/70",
                        )}
                      >
                        <Icon className={cn("size-[18px] shrink-0", active && "text-glow")} aria-hidden />
                        <span className="hidden lg:inline">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-ink-800 p-3">
          <DemoDataSwitcher dark className="mb-3 hidden px-1 lg:flex" />
          <div className="hidden lg:block">
            <UserMenu variant="full" side="top" />
          </div>
          <div className="flex justify-center lg:hidden">
            <UserMenu variant="compact" side="top" />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 md:hidden">
        <Logo markOnly />
        <p className="font-heading flex-1 truncate text-base font-semibold">{titleForPath(pathname)}</p>
        <UserMenu variant="compact" side="bottom" />
      </header>

      <main className="px-4 pt-6 pb-24 md:pr-6 md:pb-12 md:pl-[calc(4rem+1.5rem)] lg:pt-8 lg:pr-8 lg:pl-[calc(15rem+2rem)]">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {primary.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center justify-center gap-1 text-xs font-medium", active ? "text-primary" : "text-muted")}>
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          onClick={() => dispatch(setMobileNavOpen(true))}
          className={cn("flex flex-col items-center justify-center gap-1 text-xs font-medium", moreActive ? "text-primary" : "text-muted")}
        >
          <Ellipsis className="size-5" aria-hidden />
          More
        </button>
      </nav>

      <Dialog.Root open={moreOpen} onOpenChange={(o) => dispatch(setMobileNavOpen(o))}>
        <Dialog.Portal>
          <Dialog.Overlay className="animate-fade-in fixed inset-0 z-40 bg-ink/40 md:hidden" />
          <Dialog.Content className="animate-sheet-in fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-sheet bg-surface px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-drawer focus:outline-none md:hidden">
            <div className="mb-2 flex items-center justify-between">
              <Dialog.Title className="font-heading text-lg font-semibold">All sections</Dialog.Title>
              <Dialog.Description className="sr-only">Go to any section of the workspace.</Dialog.Description>
              <Dialog.Close asChild>
                <IconButton label="Close">
                  <X className="size-5" />
                </IconButton>
              </Dialog.Close>
            </div>
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mt-3">
                <p className="mb-1.5 text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{group.label}</p>
                <ul className="grid grid-cols-2 gap-2">
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const active = isActivePath(pathname, href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => dispatch(setMobileNavOpen(false))}
                          className={cn(
                            "flex h-12 items-center gap-2.5 rounded-card border px-3 text-sm font-medium",
                            active ? "border-primary bg-tint text-primary" : "border-line text-ink",
                          )}
                        >
                          <Icon className="size-[18px] shrink-0" aria-hidden />
                          <span className="truncate">{label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <DemoDataSwitcher className="mt-5 border-t border-line pt-4" />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <PlatformOverlays />
    </div>
  );
}
