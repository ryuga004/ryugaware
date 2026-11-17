import type { Metadata } from "next";
import { WebsiteCreatedPanel } from "@/features/websites/components/create/WebsiteCreatedPanel";

export const metadata: Metadata = { title: "Website created" };

export default async function WebsiteCreatedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WebsiteCreatedPanel websiteId={id} />;
}
