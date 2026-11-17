import type { Metadata } from "next";
import { WebsiteEditor } from "@/features/storefront/components/editor/WebsiteEditor";

export const metadata: Metadata = { title: "Website editor" };

export default async function WebsiteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WebsiteEditor websiteId={id} />;
}
