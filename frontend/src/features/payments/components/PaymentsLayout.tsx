"use client";

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/platform/PageHeader";
import { TabNav } from "@/components/platform/TabNav";
import { Button } from "@/components/ui/Button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { openAddMethod, selectMethodCounts } from "../slice";

const TABS = [
  { href: "/payments", label: "Methods" },
  { href: "/payments/transactions", label: "Transactions" },
  { href: "/payments/revenue", label: "Revenue" },
];

/** Shared header + route tabs for Methods, Transactions and Revenue. */
export function PaymentsLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const counts = useAppSelector(selectMethodCounts);
  // The methods empty state has its own call to action, so the header one only shows once methods exist.
  const showAdd = pathname === "/payments" && counts?.all !== 0;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Payment methods, transaction history and revenue."
        actions={
          showAdd && (
            <Button leftIcon={<Plus className="size-4" />} onClick={() => dispatch(openAddMethod())}>
              Add payment method
            </Button>
          )
        }
      />
      <TabNav label="Payments sections" items={TABS} />
      {children}
    </>
  );
}
