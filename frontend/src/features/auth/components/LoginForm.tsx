"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/platform/Alert";
import { FormField } from "@/components/platform/FormField";
import { PasswordInput } from "@/components/platform/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { USE_DUMMY_API } from "@/lib/api/config";
import { isApiError } from "@/lib/api/types";
import { useLoginMutation } from "../api";
import { safeNext } from "../utils";
import { loginSchema, type LoginValues } from "../schemas";
import { AuthFooterLink, AuthHeading, authLinkClass } from "./AuthLayout";

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [login, { isLoading }] = useLoginMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" }, mode: "onTouched" });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values).unwrap();
      router.replace(next);
    } catch (e) {
      if (isApiError(e) && e.data.code === "email_not_verified") {
        router.replace(`/verify-email?email=${encodeURIComponent(values.email.trim().toLowerCase())}`);
        return;
      }
      setFormError(isApiError(e) ? e.data.message : "Something went wrong. Please try again.");
    }
  });

  return (
    <>
      <AuthHeading title="Sign in to Ryugaware" description="Welcome back. Enter your details to continue." />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <FormField label="Email" error={errors.email?.message}>
          {(c) => <Input {...c} type="email" inputSize="lg" placeholder="you@company.com" autoComplete="email" disabled={isLoading} {...register("email")} />}
        </FormField>
        <FormField
          label="Password"
          error={errors.password?.message}
          labelAction={
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          }
        >
          {(c) => <PasswordInput {...c} inputSize="lg" placeholder="Enter your password" autoComplete="current-password" disabled={isLoading} {...register("password")} />}
        </FormField>
        <Button type="submit" size="lg" fullWidth loading={isLoading} className="mt-1">
          {isLoading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <AuthFooterLink>
        Don’t have an account?{" "}
        <Link href="/register" className={authLinkClass}>
          Create one
        </Link>
      </AuthFooterLink>
      {USE_DUMMY_API && (
        <p className="mt-8 rounded-md border border-dashed border-line-strong p-3 text-xs text-muted">
          Demo account: <code className="font-mono">priya@bloomstudio.com</code> / <code className="font-mono">Password1!</code>
          <br />
          Unverified account: <code className="font-mono">unverified@example.com</code>
        </p>
      )}
    </>
  );
}
