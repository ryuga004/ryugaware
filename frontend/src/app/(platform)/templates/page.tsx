import type { Metadata } from "next";
import { TemplatesPage } from "@/features/templates/components/TemplatesPage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Templates" };

export default function Page() {
  return <TemplatesPage />;
}
