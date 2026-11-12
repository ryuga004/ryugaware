"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, RotateCcw } from "lucide-react";
import { Alert } from "@/components/platform/Alert";
import { CopyButton } from "@/components/platform/CopyButton";
import { FormField } from "@/components/platform/FormField";
import { PasswordInput } from "@/components/platform/PasswordInput";
import { SaveBar } from "@/components/platform/SaveBar";
import { SettingsSection } from "@/components/platform/SettingsSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { applyFieldErrors } from "@/lib/api/helpers";
import { getErrorMessage } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useSaveCustomerAuthMutation, useTestGoogleSignInMutation } from "../api";
import { MAX_ALLOWED_DOMAINS, MAX_PASSWORD, MIN_PASSWORD, RECOMMENDED_AUTH, SESSION_OPTIONS } from "../constants";
import { AUTH_FIELDS, authSchema, toAuthValues, type AuthValues } from "../schemas";
import { cancelAuthSetup, openResetAuth, requestAuthScope, selectGoogleTest, setAuthScope } from "../slice";
import type { AuthScopeResponse, AuthSettingsInput } from "../types";
import { AuthPreview } from "./AuthPreview";
import { DomainChipsInput } from "./DomainChipsInput";
import { ScopeRow } from "./ScopeRow";

const FORM_ID = "customer-auth-form";

/** Settings for one scope (default or a website). `setup`: first-time onboarding with recommended values. */
export function AuthSettingsForm({ response, setup }: { response: AuthScopeResponse; setup: boolean }) {
  const dispatch = useAppDispatch();
  const googleTest = useAppSelector(selectGoogleTest);
  const [save, { isLoading: saving }] = useSaveCustomerAuthMutation();
  const [testGoogle, { isLoading: testing }] = useTestGoogleSignInMutation();
  const [formError, setFormError] = useState<string | null>(null);

  const { scope, settings, websiteName, inherited } = response;
  const secretHint = setup ? null : (settings?.google.clientSecretHint ?? null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    getValues,
    formState: { errors, isDirty },
  } = useForm<AuthValues, unknown, AuthSettingsInput>({
    resolver: zodResolver(authSchema(Boolean(secretHint))),
    defaultValues: toAuthValues(setup || !settings ? RECOMMENDED_AUTH : settings),
    mode: "onTouched",
  });

  // Reset from the server copy whenever it changes (scope switch, save, reset to default).
  useEffect(() => {
    reset(toAuthValues(setup || !response.settings ? RECOMMENDED_AUTH : response.settings));
  }, [response, setup, reset]);

  const [emailOn, googleOn] = useWatch({ control, name: ["email.enabled", "google.enabled"] });

  const onSave = handleSubmit(async (input) => {
    setFormError(null);
    try {
      await save({ scope, input }).unwrap();
    } catch (e) {
      if (!applyFieldErrors(e, AUTH_FIELDS, setError)) setFormError(getErrorMessage(e));
    }
  });

  const onTestGoogle = async () => {
    const g = getValues("google");
    try {
      await testGoogle({ scope, clientId: g.clientId.trim(), clientSecret: g.clientSecret.trim(), allowedDomains: g.allowedDomains }).unwrap();
    } catch (e) {
      applyFieldErrors(e, AUTH_FIELDS, setError);
    }
  };

  const onResetForm = () => {
    setFormError(null);
    if (setup) dispatch(cancelAuthSetup());
    else reset();
  };

  const changeScope = (next: string) => {
    if (next === scope) return;
    dispatch(isDirty ? requestAuthScope(next) : setAuthScope(next));
  };

  const toggle = (name: "email.enabled" | "email.allowSignups" | "email.requireVerification" | "google.enabled", title: string, description: string, dim?: boolean) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const id = `auth-${name.replace(".", "-")}`;
        return (
          <div className={cn("flex items-start justify-between gap-4", dim && "opacity-60")}>
            <div className="min-w-0">
              <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium text-ink">
                {title}
              </label>
              <p className="text-xs text-muted">{description}</p>
            </div>
            <Switch
              id={id}
              checked={field.value}
              aria-labelledby={`${id}-label`}
              onCheckedChange={(v) => {
                field.onChange(v);
                setFormError(null);
              }}
            />
          </div>
        );
      }}
    />
  );

  return (
    <>
      {!setup && <ScopeRow value={scope} onChange={changeScope} inherited={websiteName ? inherited : null} />}

      <div className="flex flex-col gap-4">
        {setup && <Alert>These are the recommended settings. Review them and turn sign-in on. You can add Google sign-in now or later.</Alert>}
        {websiteName && inherited && (
          <Alert>
            <strong>{websiteName}</strong> uses the default sign-in settings. Changes you save here apply to {websiteName} only.
          </Alert>
        )}
        {websiteName && !inherited && (
          <Alert
            action={
              <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="size-3.5" />} onClick={() => dispatch(openResetAuth())} className="-my-1.5 shrink-0">
                Reset to default
              </Button>
            }
          >
            <strong>{websiteName}</strong> uses its own sign-in settings. Reset to use the defaults again.
          </Alert>
        )}
        {!emailOn && !googleOn && (
          <Alert tone="warning">No sign-in method is enabled. Customers can still check out as guests, but they can’t create accounts or sign in.</Alert>
        )}
        {formError && <Alert tone="error">{formError}</Alert>}
      </div>

      <form id={FORM_ID} onSubmit={onSave} noValidate className="mt-6 flex flex-col gap-10 pb-24">
        <SettingsSection title="Email and password" description="Customers sign up and sign in with their email address and a password.">
          <div className="flex flex-col gap-5">
            {toggle("email.enabled", "Enable email and password", "Customers can create an account and sign in with email.")}
            <div className="flex flex-col gap-5 border-t border-line pt-5">
              {toggle("email.allowSignups", "Allow new sign-ups", "Turn off to let existing customers sign in but stop new registrations.", !emailOn)}
              {toggle("email.requireVerification", "Require email verification", "Customers must confirm their address before placing an order.", !emailOn)}
              <div className={cn("grid gap-5 sm:grid-cols-2", !emailOn && "opacity-60")}>
                <FormField label="Minimum password length" error={errors.email?.minPasswordLength?.message} hint={`${MIN_PASSWORD} to ${MAX_PASSWORD} characters.`}>
                  {(c) => (
                    <Input
                      {...c}
                      {...register("email.minPasswordLength", { valueAsNumber: true })}
                      type="number"
                      inputMode="numeric"
                      min={MIN_PASSWORD}
                      max={MAX_PASSWORD}
                      suffix="characters"
                    />
                  )}
                </FormField>
                <FormField label="Session length" error={errors.email?.sessionDays?.message} hint="How long customers stay signed in.">
                  {(c) => <Select {...c} {...register("email.sessionDays")} options={SESSION_OPTIONS} />}
                </FormField>
              </div>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Google" description="Let customers sign in with their Google account.">
          <div className="flex flex-col gap-5">
            {toggle("google.enabled", "Enable Google sign-in", "Uses OAuth 2.0. You need a Google Cloud project with an OAuth client.")}
            {googleOn && (
              <div className="flex flex-col gap-5 border-t border-line pt-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Client ID" required error={errors.google?.clientId?.message}>
                    {(c) => <Input {...c} {...register("google.clientId")} mono placeholder="…apps.googleusercontent.com" autoComplete="off" spellCheck={false} />}
                  </FormField>
                  <FormField
                    label="Client secret"
                    required={!secretHint}
                    error={errors.google?.clientSecret?.message}
                    hint={secretHint ? "Saved. Enter a new secret to replace it." : undefined}
                  >
                    {(c) => <PasswordInput {...c} {...register("google.clientSecret")} mono placeholder={secretHint ?? "GOCSPX-…"} autoComplete="new-password" spellCheck={false} />}
                  </FormField>
                </div>
                <FormField label="Authorized redirect URI" hint="Add this exact URL under “Authorized redirect URIs” in Google Cloud.">
                  {(c) => <Input {...c} readOnly mono value={response.redirectUri} rightSlot={<CopyButton value={response.redirectUri} label="Copy redirect URI" size="sm" />} />}
                </FormField>
                <FormField
                  label="Allowed email domains (optional)"
                  error={errors.google?.allowedDomains?.message ?? errors.google?.allowedDomains?.root?.message}
                  hint="Leave empty to allow any Google account. Press Enter or comma after each domain."
                >
                  {(c) => (
                    <Controller
                      control={control}
                      name="google.allowedDomains"
                      render={({ field }) => (
                        <DomainChipsInput id={c.id} invalid={c.invalid} aria-describedby={c["aria-describedby"]} value={field.value} onChange={field.onChange} max={MAX_ALLOWED_DOMAINS} />
                      )}
                    />
                  )}
                </FormField>
                <div className="flex flex-col gap-3 border-t border-line pt-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted">Runs a test sign-in with a Google test account using the values above, without saving them.</p>
                    <Button variant="secondary" leftIcon={<LogIn className="size-4" />} onClick={onTestGoogle} loading={testing} className="max-sm:w-full">
                      {testing ? "Testing…" : "Test sign-in"}
                    </Button>
                  </div>
                  {googleTest && <Alert tone={googleTest.ok ? "success" : "error"}>{googleTest.message}</Alert>}
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        <SettingsSection title="Preview" description={websiteName ? `The sign-in page on ${websiteName}.` : "The sign-in page on websites that use these settings."}>
          <AuthPreview emailOn={emailOn} googleOn={googleOn} websiteName={websiteName} />
        </SettingsSection>

        {scope === "default" && !setup && response.overrides.length > 0 && (
          <SettingsSection title="Website overrides" description="These websites use their own sign-in settings instead of the default.">
            <ul className="-my-3 divide-y divide-line">
              {response.overrides.map((o) => (
                <li key={o.websiteId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{o.websiteName}</p>
                    <p className="text-xs text-muted">Updated {formatDate(o.updatedAt)}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => changeScope(o.websiteId)}>
                    View
                  </Button>
                </li>
              ))}
            </ul>
          </SettingsSection>
        )}
      </form>

      <SaveBar dirty={setup || isDirty} saving={saving} onReset={onResetForm} formId={FORM_ID} saveLabel={setup ? "Turn on sign-in" : "Save changes"} />
    </>
  );
}
