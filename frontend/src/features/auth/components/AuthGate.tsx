"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ErrorState } from "@/components/platform/ErrorState";
import { useGetSessionQuery } from "../api";
import { safeNext } from "../utils";

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-page" role="status" aria-label="Loading">
      <Loader2 className="size-6 animate-spin text-muted" />
    </div>
  );
}

/** Wraps the signed-in app. Anonymous visitors are sent to /login and returned to where they were headed. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isLoading, isError, refetch } = useGetSessionQuery();
  const anonymous = session && !session.authenticated;

  useEffect(() => {
    if (anonymous) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [anonymous, pathname, router]);

  if (isError) return <div className="p-6"><ErrorState title="We couldn’t check your session" onRetry={refetch} /></div>;
  if (isLoading || !session?.authenticated) return <FullPageLoader />;
  return <>{children}</>;
}

/** On auth pages: signed-in users are sent straight to the dashboard. */
export function RedirectIfAuthenticated() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { data: session } = useGetSessionQuery();
  const authed = session?.authenticated === true;
  useEffect(() => {
    if (authed) router.replace(next);
  }, [authed, next, router]);
  return null;
}
