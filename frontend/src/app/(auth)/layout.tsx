import { Suspense } from "react";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { RedirectIfAuthenticated } from "@/features/auth/components/AuthGate";

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <RedirectIfAuthenticated />
      </Suspense>
      {children}
    </AuthLayout>
  );
}
