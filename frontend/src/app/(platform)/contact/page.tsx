import type { Metadata } from "next";
import { ContactPage } from "@/features/contact/components/ContactPage";

// Rendered after the client-side session check in the (platform) layout, so not instant on first load.
export const instant = false;
export const metadata: Metadata = { title: "Contact details" };

export default function Page() {
  return <ContactPage />;
}
