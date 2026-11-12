import type { Metadata } from "next";
import { DeliveryMethodsPage } from "@/features/delivery/components/DeliveryMethodsPage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Delivery methods" };

export default function Page() {
  return <DeliveryMethodsPage />;
}
