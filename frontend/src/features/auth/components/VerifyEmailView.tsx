"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert } from "@/components/platform/Alert";
import { FormField } from "@/components/platform/FormField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { isApiError } from "@/lib/api/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRegisterMutation, useResendEmailOtpMutation, useVerifyEmailOtpMutation } from "../api";
import { formatCountdown, useCountdown } from "../hooks";
import { otpSchema, type OtpValues } from "../schemas";
import { clearPendingRegistration, selectCooldownUntil, selectPendingRegistration } from "../slice";
import { AuthHeading, StatusPanel, authLinkClass } from "./AuthLayout";

const primaryLink =
  "inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-base font-medium text-white hover:bg-primary-hover";

/**
 * Second half of registration: the address is proved with a 6-digit code, and only then is the
 * organization created. The details entered on the register screen live in Redux until that happens.
 */
export function VerifyEmailView() {
  const dispatch = useAppDispatch();
  const pending = useAppSelector(selectPendingRegistration);
  const cooldownUntil = useAppSelector(selectCooldownUntil);
  const remaining = useCountdown(cooldownUntil);

  const [verifyOtp, { isLoading: verifying }] = useVerifyEmailOtpMutation();
  const [registerAccount, { isLoading: registering, isSuccess }] = useRegisterMutation();
  const [resend, { isLoading: resending }] = useResendEmailOtpMutation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<OtpValues>({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" }, mode: "onSubmit" });

  const busy = verifying || registering;

  const onSubmit = handleSubmit(async ({ otp }) => {
    if (!pending) return;
    try {
      const { registrationToken } = await verifyOtp({ email: pending.email, otp }).unwrap();
      await registerAccount({ ...pending, registrationToken }).unwrap();
    } catch (e) {
      if (!isApiError(e)) {
        setError("root", { message: "Something went wrong. Please try again." });
        return;
      }
      switch (e.data.code) {
        case "invalid_otp":
          setError("otp", { message: "That code isn’t right. Check your email and try again." });
          break;
        case "otp_expired_or_invalid":
          setError("root", { message: "That code has expired. Send yourself a new one." });
          break;
        case "rate_limited":
          setError("root", { message: "Too many attempts. Try again in about 30 minutes." });
          break;
        case "email_verification_required":
        case "invalid_registration_token":
          setError("root", { message: "Your verification expired. Send a new code and try again." });
          break;
        case "email_already_registered":
        case "organization_name_already_exists":
          setError("root", { message: `${e.data.message}. Start again with different details.` });
          break;
        default:
          setError("root", { message: e.data.message });
      }
    }
  });

  if (isSuccess) {
    return (
      <StatusPanel
        tone="success"
        icon={<CircleCheck className="size-7" aria-hidden />}
        title="Account created"
        actions={
          <Link href="/login" className={primaryLink}>
            Sign in
          </Link>
        }
      >
        Your organization is ready. Sign in to pick a template and publish your first website.
      </StatusPanel>
    );
  }

  if (!pending) {
    return (
      <StatusPanel
        tone="danger"
        icon={<CircleAlert className="size-7" aria-hidden />}
        title="Start your sign-up again"
        actions={
          <Link href="/register" className={primaryLink}>
            Back to sign-up
          </Link>
        }
      >
        We don’t have your details any more — this page was reloaded or opened directly. Your code is
        still valid for a few minutes once you start again.
      </StatusPanel>
    );
  }

  return (
    <>
      <AuthHeading
        title="Check your email"
        description={`We sent a 6-digit code to ${pending.email}. It expires in 5 minutes.`}
      />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {errors.root?.message && <Alert tone="error">{errors.root.message}</Alert>}

        <FormField label="Verification code" error={errors.otp?.message} hint="6 digits, from the email we just sent.">
          {(c) => (
            <Input
              {...c}
              mono
              inputSize="lg"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              disabled={busy}
              className="text-center text-xl tracking-[0.5em]"
              {...register("otp")}
            />
          )}
        </FormField>

        <Button type="submit" size="lg" fullWidth loading={busy}>
          {registering ? "Creating account…" : verifying ? "Verifying…" : "Verify and create account"}
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-3">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          disabled={remaining > 0 || busy}
          loading={resending}
          onClick={() => resend({ email: pending.email })}
        >
          {remaining > 0 ? `Resend code in ${formatCountdown(remaining)}` : "Resend code"}
        </Button>
        <p className="text-center text-xs text-muted">
          Wrong address?{" "}
          <Link
            href="/register"
            className={authLinkClass}
            onClick={() => dispatch(clearPendingRegistration())}
          >
            Start again
          </Link>
        </p>
      </div>
    </>
  );
}
