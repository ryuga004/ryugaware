import type { Metadata } from "next";
import { TransactionsPage } from "@/features/payments/components/TransactionsPage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Transactions" };

export default function Page() {
  return <TransactionsPage />;
}
