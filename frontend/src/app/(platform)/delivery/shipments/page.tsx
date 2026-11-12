import type { Metadata } from "next";
import { ShipmentsPage } from "@/features/delivery/components/ShipmentsPage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Shipments" };

export default function Page() {
  return <ShipmentsPage />;
}
