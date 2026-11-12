import type { Metadata } from "next";
import { WebsitesPage } from "@/features/websites/components/WebsitesPage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Websites" };

export default function Page() {
  return <WebsitesPage />;
}
