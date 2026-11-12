import type { Metadata } from "next";
import { PaymentMethodsPage } from "@/features/payments/components/PaymentMethodsPage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Payment methods" };

export default function Page() {
  return <PaymentMethodsPage />;
}
