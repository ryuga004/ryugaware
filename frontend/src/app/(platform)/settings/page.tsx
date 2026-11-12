import type { Metadata } from "next";
import { SettingsPage } from "@/features/settings/components/SettingsPage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <SettingsPage />;
}
