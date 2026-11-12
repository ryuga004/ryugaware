"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, User as UserIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useGetMeQuery } from "@/features/account/api";
import { useLogoutMutation } from "@/features/auth/api";
import { cn } from "@/lib/cn";
import { ActionMenu } from "./ActionMenu";

/** Sidebar footer (full), tablet rail (avatar only) and mobile top bar (avatar only). */
export function UserMenu({ variant = "full", side = "top" }: { variant?: "full" | "compact"; side?: "top" | "bottom" }) {
  const router = useRouter();
  const [logout] = useLogoutMutation();
  const { data: user, isLoading } = useGetMeQuery();

  const name = user?.fullName ?? "";
  const items = [
    { key: "profile", label: "Profile", href: "/profile", icon: <UserIcon className="size-4 text-muted" /> },
    {
      key: "logout",
      label: "Log out",
      icon: <LogOut className="size-4 text-muted" />,
      separated: true,
      onSelect: async () => {
        await logout();
        router.replace("/login");
      },
    },
  ];

  if (isLoading || !user) {
    return variant === "full" ? (
      <div className="flex items-center gap-2.5 p-2">
        <Skeleton className="size-7 rounded-full bg-ink-800" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-24 bg-ink-800" />
          <Skeleton className="h-3 w-32 bg-ink-800" />
        </div>
      </div>
    ) : (
      <Skeleton className="size-8 rounded-full" />
    );
  }

  return (
    <ActionMenu
      side={side}
      align={variant === "full" ? "start" : "end"}
      trigger={
        variant === "full" ? (
          <button type="button" aria-label="Account menu" className="flex w-full items-center gap-2.5 rounded-md p-2 text-left hover:bg-ink-800 data-[state=open]:bg-ink-800">
            <Avatar name={name} className="bg-ink-700" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-page">{name}</span>
              <span className="block truncate text-xs text-on-dark/80">{user.email}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-on-dark/80" aria-hidden />
          </button>
        ) : (
          <button type="button" aria-label="Account menu" className={cn("rounded-full")}>
            <Avatar name={name} size={32} />
          </button>
        )
      }
      items={items}
    />
  );
}
