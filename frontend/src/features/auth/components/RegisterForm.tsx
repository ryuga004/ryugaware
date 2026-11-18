"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/platform/Alert";
import { FormField } from "@/components/platform/FormField";
import { PasswordInput } from "@/components/platform/PasswordInput";
import { PasswordRules } from "@/components/platform/PasswordRules";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { isApiError } from "@/lib/api/types";
import { useRequestEmailOtpMutation } from "../api";
import { registerSchema, type RegisterValues } from "../schemas";
import { setPendingRegistration } from "../slice";
import { useAppDispatch } from "@/store/hooks";
import { AuthFooterLink, AuthHeading, authLinkClass } from "./AuthLayout";

export function RegisterForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [requestOtp, { isLoading }] = useRequestEmailOtpMutation();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", orgName: "", email: "", password: "", acceptTerms: false },
    mode: "onTouched",
  });
  const password = useWatch({ control, name: "password" });

  // The account is only created after the address is verified, so this step just sends the code.
  const onSubmit = handleSubmit(async (form) => {
    const pending = { fullName: form.fullName, orgName: form.orgName, email: form.email.trim().toLowerCase(), password: form.password };
    try {
      await requestOtp({ email: pending.email }).unwrap();
      dispatch(setPendingRegistration(pending));
      router.replace("/verify-email");
    } catch (e) {
      if (!isApiError(e)) return;
      if (e.data.code === "email_already_registered") {
        setError("email", { message: "This email is already registered." });
        return;
      }
      if (e.data.fieldErrors) {
        for (const [field, message] of Object.entries(e.data.fieldErrors)) setError(field as keyof RegisterValues, { message });
        return;
      }
      setError("root", { message: e.data.message });
    }
  });

  const emailTaken = errors.email?.message?.includes("already registered");

  return (
    <>
      <AuthHeading title="Create your account" description="Start building your website in minutes." />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {errors.root?.message && <Alert tone="error">{errors.root.message}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Full name" error={errors.fullName?.message}>
            {(c) => <Input {...c} inputSize="lg" placeholder="Priya Sharma" autoComplete="name" disabled={isLoading} {...register("fullName")} />}
          </FormField>
          <FormField label="Organization" error={errors.orgName?.message}>
            {(c) => <Input {...c} inputSize="lg" placeholder="Bloom Studio" autoComplete="organization" disabled={isLoading} {...register("orgName")} />}
          </FormField>
        </div>
        <p className="-mt-3 text-xs text-muted">Shown in your dashboard. You can change it later.</p>

        <FormField
          label="Work email"
          error={errors.email?.message}
        >
          {(c) => <Input {...c} type="email" inputSize="lg" placeholder="priya@bloomstudio.com" autoComplete="email" disabled={isLoading} {...register("email")} />}
        </FormField>
        {emailTaken && (
          <p className="-mt-3 text-xs">
            <Link href="/login" className={authLinkClass}>
              Sign in instead
            </Link>
          </p>
        )}

        <div className="flex flex-col gap-3">
          <FormField label="Password" error={errors.password?.message}>
            {(c) => <PasswordInput {...c} inputSize="lg" placeholder="Create a password" autoComplete="new-password" disabled={isLoading} {...register("password")} />}
          </FormField>
          <PasswordRules value={password} />
        </div>

        <Controller
          control={control}
          name="acceptTerms"
          render={({ field }) => (
            <div className="flex flex-col gap-1.5">
              <Checkbox
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                disabled={isLoading}
                label={
                  <>
                    I agree to the <Link href="#" className={authLinkClass}>Terms of Service</Link> and <Link href="#" className={authLinkClass}>Privacy Policy</Link>
                  </>
                }
              />
              {errors.acceptTerms?.message && <p className="text-xs text-danger-hover">{errors.acceptTerms.message}</p>}
            </div>
          )}
        />

        <Button type="submit" size="lg" fullWidth loading={isLoading}>
          {isLoading ? "Sending code…" : "Create account"}
        </Button>
        <p className="-mt-2 text-center text-xs text-muted">We’ll email you a 6-digit code to confirm your address.</p>
      </form>
      <AuthFooterLink>
        Already have an account?{" "}
        <Link href="/login" className={authLinkClass}>
          Sign in
        </Link>
      </AuthFooterLink>
    </>
  );
}
