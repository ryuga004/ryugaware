import { Suspense } from "react";
import { AppShell } from "@/components/platform/AppShell";
import { AuthGate, FullPageLoader } from "@/features/auth/components/AuthGate";

/**
 * The signed-in area waits for a client-side session check (the dummy API lives in the browser), so its
 * first load cannot be instant. Navigating between pages inside it is: this layout stays mounted.
 */
export const instant = false;

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  // The signed-in app is client-only (session check), so stream it behind a loader instead of prerendering it.
  return (
    <Suspense fallback={<FullPageLoader />}>
      <AuthGate>
        <AppShell>{children}</AppShell>
      </AuthGate>
    </Suspense>
  );
}
