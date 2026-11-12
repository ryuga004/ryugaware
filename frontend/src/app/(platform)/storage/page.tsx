import type { Metadata } from "next";
import { StoragePage } from "@/features/storage/components/StoragePage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Storage" };

export default function Page() {
  return <StoragePage />;
}
