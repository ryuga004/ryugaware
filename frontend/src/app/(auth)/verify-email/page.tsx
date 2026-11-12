import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailView } from "@/features/auth/components/VerifyEmailView";

export const metadata: Metadata = { title: "Verify your email" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailView />
    </Suspense>
  );
}
