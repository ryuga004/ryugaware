import type { Metadata } from "next";
import { CustomersPage } from "@/features/customers/components/CustomersPage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Users" };

export default function Page() {
  return <CustomersPage />;
}
