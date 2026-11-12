"use client";

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/platform/PageHeader";
import { TabNav } from "@/components/platform/TabNav";
import { Button } from "@/components/ui/Button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { openAddMethod, selectMethodCounts } from "../slice";

const TABS = [
  { href: "/delivery", label: "Methods" },
  { href: "/delivery/shipments", label: "Shipments" },
];

/** Shared header + route tabs for /delivery (methods) and /delivery/shipments. */
export function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const counts = useAppSelector(selectMethodCounts);
  // The empty state has its own call to action, so the header button only shows once methods exist.
  const showAdd = pathname === "/delivery" && Boolean(counts?.all);

  return (
    <>
      <PageHeader
        title="Delivery"
        description="Delivery methods and shipment history."
        actions={
          showAdd && (
            <Button leftIcon={<Plus className="size-4" />} onClick={() => dispatch(openAddMethod())}>
              Add delivery method
            </Button>
          )
        }
      />
      <TabNav label="Delivery sections" items={TABS} />
      {children}
    </>
  );
}
