import type { Metadata } from "next";
import { CustomerAuthPage } from "@/features/customer-auth/components/CustomerAuthPage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Authentication" };

export default function Page() {
  return <CustomerAuthPage />;
}
