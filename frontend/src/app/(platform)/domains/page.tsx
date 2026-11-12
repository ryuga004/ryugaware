import type { Metadata } from "next";
import { DomainsPage } from "@/features/domains/components/DomainsPage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Domains" };

export default function Page() {
  return <DomainsPage />;
}
