"use client";

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/platform/FormField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { USE_DUMMY_API } from "@/lib/api/config";
import { isApiError } from "@/lib/api/types";
import { useAppSelector } from "@/store/hooks";
import { useForgotPasswordMutation } from "../api";
import { formatCountdown, useCountdown } from "../hooks";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas";
import { selectCooldownUntil, selectPendingEmail } from "../slice";
import { AuthHeading, StatusPanel, authLinkClass } from "./AuthLayout";

export function ForgotPasswordForm() {
  const [forgot, { isLoading, isSuccess }] = useForgotPasswordMutation();
  const pendingEmail = useAppSelector(selectPendingEmail);
  const cooldownUntil = useAppSelector(selectCooldownUntil);
  const remaining = useCountdown(cooldownUntil);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" }, mode: "onTouched" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await forgot(values).unwrap();
    } catch (e) {
      if (isApiError(e) && e.data.fieldErrors?.email) setError("email", { message: e.data.fieldErrors.email });
    }
  });

  if (isSuccess && pendingEmail) {
    return (
      <StatusPanel
        icon={<Mail className="size-7" aria-hidden />}
        title="Check your email"
        actions={
          <>
            <p className="text-sm text-muted">
              {remaining > 0 ? (
                <>Didn’t get it? Resend in {formatCountdown(remaining)}</>
              ) : (
                <>
                  Didn’t get it?{" "}
                  <button type="button" className={authLinkClass} onClick={() => forgot({ email: pendingEmail })} disabled={isLoading}>
                    Resend
                  </button>
                </>
              )}
            </p>
            <Link href="/login" className={`${authLinkClass} inline-flex items-center justify-center gap-1.5 text-sm`}>
              <ArrowLeft className="size-4" aria-hidden /> Back to sign in
            </Link>
            {USE_DUMMY_API && (
              <p className="rounded-md border border-dashed border-line-strong p-3 text-xs text-muted">
                Demo: <Link href="/reset-password?token=valid-token" className={authLinkClass}>open the reset link</Link> ·{" "}
                <Link href="/reset-password?token=expired-token" className={authLinkClass}>expired link</Link>
              </p>
            )}
          </>
        }
      >
        If an account exists for <strong className="text-ink">{pendingEmail}</strong>, you’ll receive a reset link shortly.
      </StatusPanel>
    );
  }

  return (
    <>
      <AuthHeading title="Reset your password" description="Enter your account email and we’ll send you a reset link." />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormField label="Email" error={errors.email?.message}>
          {(c) => <Input {...c} type="email" inputSize="lg" placeholder="you@company.com" autoComplete="email" disabled={isLoading} {...register("email")} />}
        </FormField>
        <Button type="submit" size="lg" fullWidth loading={isLoading}>
          {isLoading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <Link href="/login" className={`${authLinkClass} mt-6 inline-flex items-center justify-center gap-1.5 text-sm`}>
        <ArrowLeft className="size-4" aria-hidden /> Back to sign in
      </Link>
    </>
  );
}
