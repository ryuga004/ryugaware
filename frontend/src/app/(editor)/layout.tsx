import { Suspense } from "react";
import { AuthGate, FullPageLoader } from "@/features/auth/components/AuthGate";

/**
 * The website editor runs full screen: signed in like the rest of the app, but without the
 * AppShell chrome, so the storefront preview gets the whole width.
 */
export const instant = false;

export default function EditorGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}
