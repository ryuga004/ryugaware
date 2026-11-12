"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/platform/FormField";
import { PasswordInput } from "@/components/platform/PasswordInput";
import { PasswordRules } from "@/components/platform/PasswordRules";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { isApiError } from "@/lib/api/types";
import { useResetPasswordMutation, useValidateResetTokenQuery } from "../api";
import { resetPasswordSchema, type ResetPasswordValues } from "../schemas";
import { AuthHeading, StatusPanel } from "./AuthLayout";

const primaryLink = "inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-base font-medium text-white hover:bg-primary-hover";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const { data: check, isLoading: validating } = useValidateResetTokenQuery(token, { skip: !token });
  const [resetPassword, { isLoading, isSuccess, error: resetError }] = useResetPasswordMutation();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirmPassword: "" }, mode: "onTouched" });
  const password = useWatch({ control, name: "password" });

  const onSubmit = handleSubmit(async ({ password }) => {
    try {
      await resetPassword({ token, password }).unwrap();
    } catch (e) {
      if (isApiError(e) && e.data.fieldErrors?.password) setError("password", { message: e.data.fieldErrors.password });
    }
  });

  const linkProblem = !token || check?.valid === false || (isApiError(resetError) && (resetError.data.code === "link_expired" || resetError.data.code === "link_invalid"));

  if (isSuccess) {
    return (
      <StatusPanel
        tone="success"
        icon={<CircleCheck className="size-7" aria-hidden />}
        title="Password updated"
        actions={
          <Link href="/login" className={primaryLink}>
            Sign in
          </Link>
        }
      >
        You can now sign in with your new password.
      </StatusPanel>
    );
  }

  if (linkProblem) {
    return (
      <StatusPanel
        tone="danger"
        icon={<CircleAlert className="size-7" aria-hidden />}
        title="This reset link is no longer valid"
        actions={
          <Link href="/forgot-password" className={primaryLink}>
            Request a new link
          </Link>
        }
      >
        It may have expired or already been used.
      </StatusPanel>
    );
  }

  if (validating) {
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Set a new password" description="Choose a password you haven’t used before." />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <FormField label="New password" error={errors.password?.message}>
            {(c) => <PasswordInput {...c} inputSize="lg" autoComplete="new-password" disabled={isLoading} {...register("password")} />}
          </FormField>
          <PasswordRules value={password} />
        </div>
        <FormField label="Confirm password" error={errors.confirmPassword?.message}>
          {(c) => <PasswordInput {...c} inputSize="lg" autoComplete="new-password" disabled={isLoading} {...register("confirmPassword")} />}
        </FormField>
        <Button type="submit" size="lg" fullWidth loading={isLoading}>
          {isLoading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </>
  );
}
