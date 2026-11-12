import type { Metadata } from "next";
import { ProfilePage } from "@/features/account/components/ProfilePage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return <ProfilePage />;
}
