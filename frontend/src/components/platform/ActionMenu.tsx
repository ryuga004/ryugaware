"use client";

import Link from "next/link";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  /** Renders a link item instead of a button item. */
  href?: string;
  tone?: "default" | "danger";
  disabled?: boolean;
  /** Draws a divider above this item. */
  separated?: boolean;
}

/** Dropdown / action menu. `trigger` must be a single focusable element. */
export function ActionMenu({
  trigger,
  items,
  align = "end",
  side = "bottom",
  minWidth = 200,
}: {
  trigger: React.ReactNode;
  items: ActionMenuItem[];
  align?: "start" | "end";
  side?: "top" | "bottom";
  minWidth?: number;
}) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align={align}
          side={side}
          sideOffset={6}
          style={{ minWidth }}
          className="animate-pop-in z-[80] rounded-card border border-line bg-surface p-1 shadow-pop"
        >
          {items.map((item) => {
            const cls = cn(
              "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm outline-none select-none",
              "data-[highlighted]:bg-subtle data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45",
              item.tone === "danger" ? "text-danger data-[highlighted]:bg-danger-bg" : "text-ink",
            );
            return (
              <div key={item.key}>
                {item.separated && <Dropdown.Separator className="my-1 h-px bg-line" />}
                {item.href ? (
                  <Dropdown.Item asChild disabled={item.disabled}>
                    <Link href={item.href} className={cls}>
                      {item.icon}
                      {item.label}
                    </Link>
                  </Dropdown.Item>
                ) : (
                  <Dropdown.Item className={cls} disabled={item.disabled} onSelect={item.onSelect}>
                    {item.icon}
                    {item.label}
                  </Dropdown.Item>
                )}
              </div>
            );
          })}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
