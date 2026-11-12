"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { CircleAlert, CircleCheck, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { USE_DUMMY_API } from "@/lib/api/config";
import { isApiError } from "@/lib/api/types";
import { useAppSelector } from "@/store/hooks";
import { useResendVerificationMutation, useVerifyEmailMutation } from "../api";
import { formatCountdown, useCountdown } from "../hooks";
import { selectCooldownUntil, selectPendingEmail } from "../slice";
import { StatusPanel, authLinkClass } from "./AuthLayout";

/** Four states: check-your-inbox, verifying, verified, link expired / invalid. */
export function VerifyEmailView() {
  const params = useSearchParams();
  const token = params.get("token");
  const emailParam = params.get("email");
  const pendingEmail = useAppSelector(selectPendingEmail);
  const email = emailParam ?? pendingEmail ?? "";

  const [verify, verifyState] = useVerifyEmailMutation();
  const [resend, resendState] = useResendVerificationMutation();
  const cooldownUntil = useAppSelector(selectCooldownUntil);
  const remaining = useCountdown(cooldownUntil);

  // Verify once per token (guards against React strict-mode double effects).
  const verifiedToken = useRef<string | null>(null);
  useEffect(() => {
    if (!token || verifiedToken.current === token) return;
    verifiedToken.current = token;
    verify({ token, email: emailParam ?? undefined });
  }, [token, emailParam, verify]);

  if (token) {
    if (verifyState.isSuccess) {
      return (
        <StatusPanel
          tone="success"
          icon={<CircleCheck className="size-7" aria-hidden />}
          title="Email verified"
          actions={
            <Link href="/websites" className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-base font-medium text-white hover:bg-primary-hover">
              Continue to dashboard
            </Link>
          }
        >
          Your account is ready.
        </StatusPanel>
      );
    }
    if (verifyState.isError) {
      const expired = isApiError(verifyState.error) && verifyState.error.data.code === "link_expired";
      return (
        <StatusPanel
          tone="danger"
          icon={<CircleAlert className="size-7" aria-hidden />}
          title={expired ? "This link has expired" : "This link isn’t valid"}
          actions={
            <Link
              href={`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-base font-medium text-white hover:bg-primary-hover"
            >
              Send a new link
            </Link>
          }
        >
          {expired ? "Verification links are valid for 24 hours. We can send you a new one." : "It may have been used already. We can send you a new one."}
        </StatusPanel>
      );
    }
    return (
      <StatusPanel icon={<Loader2 className="size-7 animate-spin" aria-label="Verifying" />} title="Verifying your email…">
        This only takes a moment.
      </StatusPanel>
    );
  }

  return (
    <StatusPanel
      icon={<Mail className="size-7" aria-hidden />}
      title="Verify your email"
      actions={
        <>
          <Button variant="secondary" size="lg" fullWidth disabled={remaining > 0 || !email} loading={resendState.isLoading} onClick={() => resend({ email })}>
            {remaining > 0 ? `Resend email in ${formatCountdown(remaining)}` : "Resend email"}
          </Button>
          <p className="text-xs text-muted">
            Wrong account?{" "}
            <Link href="/login" className={authLinkClass}>
              Use a different account
            </Link>
          </p>
          {USE_DUMMY_API && (
            <p className="rounded-md border border-dashed border-line-strong p-3 text-xs text-muted">
              Demo: <Link href={`/verify-email?token=valid-token${email ? `&email=${encodeURIComponent(email)}` : ""}`} className={authLinkClass}>click the email link</Link> ·{" "}
              <Link href="/verify-email?token=expired-token" className={authLinkClass}>expired link</Link>
            </p>
          )}
        </>
      }
    >
      We sent a verification link to {email ? <strong className="text-ink">{email}</strong> : "your email"}. Click it to activate your account.
    </StatusPanel>
  );
}
