"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FlaskConical, Unplug } from "lucide-react";
import { FormField } from "@/components/platform/FormField";
import { PasswordInput } from "@/components/platform/PasswordInput";
import { SaveBar } from "@/components/platform/SaveBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { applyFieldErrors } from "@/lib/api/helpers";
import { useAppDispatch } from "@/store/hooks";
import { useSaveStorageConfigMutation, useTestStorageConnectionMutation } from "../api";
import { PROVIDER_OPTIONS, regionOptions } from "../constants";
import { STORAGE_FIELDS, storageSchema, toStorageValues, type StorageOutput, type StorageValues } from "../schemas";
import { closeStorageSetup, requestDisconnectStorage } from "../slice";
import type { StorageConfig, StorageInput, StorageProvider } from "../types";

const FORM_ID = "storage-form";
const CHECK_FIELDS = ["bucket", "region", "accessKeyId", "publicBaseUrl"] as const;

/**
 * Bucket connection form. `setup`: first connection (own buttons, no save bar).
 * `edit`: saved configuration (sticky save bar when dirty).
 */
export function StorageForm({ config, mode }: { config: StorageConfig; mode: "setup" | "edit" }) {
  const dispatch = useAppDispatch();
  const [save, { isLoading: saving }] = useSaveStorageConfigMutation();
  const [test, { isLoading: testing }] = useTestStorageConnectionMutation();
  const savedSecret = config.status === "not_connected" ? null : config.secretHint;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useForm<StorageValues, unknown, StorageOutput>({
    resolver: zodResolver(storageSchema(Boolean(savedSecret))),
    defaultValues: toStorageValues(config),
    mode: "onTouched",
  });

  // Keep the form in step with the server copy (first load, after saving, after disconnecting).
  useEffect(() => {
    reset(toStorageValues(config));
  }, [config, reset]);

  const provider = useWatch({ control, name: "provider" });

  const onSave = handleSubmit(async (values) => {
    try {
      await save(values).unwrap();
    } catch (e) {
      applyFieldErrors(e, STORAGE_FIELDS, setError);
    }
  });

  const runTest = async (input?: StorageInput) => {
    try {
      const result = await test({ input }).unwrap();
      clearErrors([...CHECK_FIELDS]);
      const failed = result.steps.find((s) => s.status === "failed");
      if (failed?.field) setError(failed.field, { message: failed.fieldMessage ?? failed.message });
    } catch (e) {
      applyFieldErrors(e, STORAGE_FIELDS, setError);
    }
  };
  // Unchanged saved settings are tested as saved (the result is stored); edited values are tested as typed.
  const onTest = mode === "edit" && !isDirty ? () => runTest() : handleSubmit((values) => runTest(values));

  const busy = saving || testing;

  return (
    <>
      <form id={FORM_ID} onSubmit={onSave} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <span id="storage-provider-label" className="text-sm font-medium text-ink">
            Provider
          </span>
          <Controller
            control={control}
            name="provider"
            render={({ field }) => (
              <SegmentedControl<StorageProvider>
                ariaLabel="Provider"
                value={field.value}
                options={PROVIDER_OPTIONS}
                className="self-start max-sm:w-full max-sm:[&>button]:flex-1"
                onChange={(v) => {
                  field.onChange(v);
                  if (v === "s3" && getValues("region") === "auto") setValue("region", "ap-south-1", { shouldDirty: true });
                }}
              />
            )}
          />
          <p className="text-xs text-muted">
            {provider === "s3" ? "A bucket in your AWS account." : "Cloudflare R2, Wasabi, DigitalOcean Spaces, MinIO and other services that speak the S3 API."}
          </p>
        </div>

        {provider === "s3_compatible" && (
          <FormField
            label="Endpoint URL"
            required
            error={errors.endpoint?.message}
            hint="R2: https://<account-id>.r2.cloudflarestorage.com · Wasabi: https://s3.<region>.wasabisys.com"
          >
            {(c) => <Input {...c} {...register("endpoint")} mono placeholder="https://<account-id>.r2.cloudflarestorage.com" autoComplete="off" spellCheck={false} inputMode="url" disabled={busy} />}
          </FormField>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Bucket name" required error={errors.bucket?.message} hint="The bucket must already exist.">
            {(c) => <Input {...c} {...register("bucket")} placeholder="my-company-assets" autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={busy} />}
          </FormField>
          <FormField label="Region" required error={errors.region?.message}>
            {(c) => <Select {...c} {...register("region")} options={regionOptions(provider)} disabled={busy} />}
          </FormField>

          <FormField label="Access key ID" required error={errors.accessKeyId?.message}>
            {(c) => <Input {...c} {...register("accessKeyId")} mono placeholder="AKIA…" autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={busy} />}
          </FormField>
          <FormField
            label="Secret access key"
            required={!savedSecret}
            error={errors.secretAccessKey?.message}
            hint={savedSecret ? "Saved. Enter a new key to replace it." : "Shown once in AWS when you create the access key."}
          >
            {(c) => (
              <PasswordInput
                {...c}
                {...register("secretAccessKey")}
                mono
                placeholder={savedSecret ?? "Paste your secret key"}
                autoComplete="new-password"
                spellCheck={false}
                disabled={busy}
              />
            )}
          </FormField>

          <FormField label="Path prefix" error={errors.pathPrefix?.message} hint="Optional folder for all files, e.g. ryugaware/.">
            {(c) => <Input {...c} {...register("pathPrefix")} mono placeholder="ryugaware/" autoComplete="off" spellCheck={false} disabled={busy} />}
          </FormField>
          <FormField label="Public base URL" error={errors.publicBaseUrl?.message} hint="Optional CDN or bucket URL used in links.">
            {(c) => <Input {...c} {...register("publicBaseUrl")} placeholder="https://cdn.example.com" autoComplete="off" spellCheck={false} inputMode="url" disabled={busy} />}
          </FormField>
        </div>

        <Controller
          control={control}
          name="forcePathStyle"
          render={({ field }) => (
            <div className="flex items-start gap-3">
              <Switch id="storage-path-style" checked={field.value} onCheckedChange={field.onChange} disabled={busy} aria-labelledby="storage-path-style-label" />
              <div className="-mt-0.5">
                <label id="storage-path-style-label" htmlFor="storage-path-style" className="text-sm font-medium text-ink">
                  Use path-style URLs
                </label>
                <p className="text-xs text-muted">Needed for some S3-compatible services. Leave off for Amazon S3.</p>
              </div>
            </div>
          )}
        />

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          {mode === "edit" ? (
            <Button variant="dangerGhost" leftIcon={<Unplug className="size-4" />} onClick={() => dispatch(requestDisconnectStorage())} disabled={busy} className="sm:-ml-3">
              Disconnect bucket
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => dispatch(closeStorageSetup())} disabled={busy} className="sm:-ml-3">
              Cancel
            </Button>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="secondary" leftIcon={<FlaskConical className="size-4" />} onClick={onTest} loading={testing} disabled={saving}>
              {testing ? "Testing…" : "Test connection"}
            </Button>
            {mode === "setup" && (
              <Button type="submit" loading={saving} disabled={testing}>
                {saving ? "Connecting…" : "Connect bucket"}
              </Button>
            )}
          </div>
        </div>
      </form>

      {mode === "edit" && <SaveBar dirty={isDirty} saving={saving} canSave={!testing} onReset={() => reset(toStorageValues(config))} formId={FORM_ID} />}
    </>
  );
}
