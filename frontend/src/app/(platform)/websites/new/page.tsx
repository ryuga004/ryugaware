import type { Metadata } from "next";
import { CreateWebsiteFlow } from "@/features/websites/components/create/CreateWebsiteFlow";

export const metadata: Metadata = { title: "Create a website" };

export default function NewWebsitePage() {
  return <CreateWebsiteFlow />;
}
