import type { Metadata } from "next";
import { RevenuePage } from "@/features/payments/components/RevenuePage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Revenue" };

export default function Page() {
  return <RevenuePage />;
}
