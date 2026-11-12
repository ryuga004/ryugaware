"use client";

import { DeleteWebsiteDialog } from "@/features/websites/components/DeleteWebsiteDialog";
import { WebsiteDrawer } from "@/features/websites/components/WebsiteDrawer";
import { TemplatePreviewModal } from "@/features/templates/components/TemplatePreviewModal";
import { ChangePasswordDrawer } from "@/features/settings/components/ChangePasswordDrawer";
import { EditProfileDrawer } from "@/features/account/components/EditProfileDrawer";

/**
 * Overlays that can be opened from several pages. Their open/closed state lives in Redux, so any page
 * (e.g. Templates -> "Use template") can open the shared New website drawer.
 */
export function PlatformOverlays() {
  return (
    <>
      <WebsiteDrawer />
      <DeleteWebsiteDialog />
      <TemplatePreviewModal />
      <ChangePasswordDrawer />
      <EditProfileDrawer />
    </>
  );
}
