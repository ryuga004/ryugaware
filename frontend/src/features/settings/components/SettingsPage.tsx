"use client";

import { useEffect, useState } from "react";
import { Copy, Info } from "lucide-react";
import { ErrorState } from "@/components/platform/ErrorState";
import { FormField } from "@/components/platform/FormField";
import { PageHeader } from "@/components/platform/PageHeader";
import { SettingsSection } from "@/components/platform/SettingsSection";
import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useGetMeQuery } from "@/features/account/api";
import { pushToast } from "@/features/ui/slice";
import { isApiError } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetOrganizationQuery, useGetSettingsOptionsQuery, useUpdateOrganizationMutation } from "../api";
import { editField, openChangePassword, resetDraft, selectDraft, selectIsDirty } from "../slice";
import type { OrganizationEditable } from "../types";
import { SessionsTable } from "./SessionsTable";

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const draft = useAppSelector(selectDraft);
  const dirty = useAppSelector(selectIsDirty);
  const { data: org, isLoading, isError, refetch, isFetching } = useGetOrganizationQuery();
  const { data: options } = useGetSettingsOptionsQuery();
  const { data: me } = useGetMeQuery();
  const [save, { isLoading: saving }] = useUpdateOrganizationMutation();
  const [serverErrors, setServerErrors] = useState<Partial<Record<keyof OrganizationEditable, string>>>({});

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const value = (key: keyof OrganizationEditable) => draft[key] ?? org?.[key] ?? "";
  const edit = (key: keyof OrganizationEditable, v: string) => {
    if (!org) return;
    setServerErrors((e) => ({ ...e, [key]: undefined }));
    dispatch(editField({ key, value: v, serverValue: org[key] }));
  };

  const nameError = draft.name !== undefined && draft.name.trim() === "" ? "Enter an organization name." : serverErrors.name;

  const onSave = async () => {
    try {
      await save(draft).unwrap(); // slice clears the draft on success
    } catch (e) {
      if (isApiError(e) && e.data.fieldErrors) setServerErrors(e.data.fieldErrors as typeof serverErrors);
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(org?.id ?? "");
      dispatch(pushToast({ tone: "info", title: "Organization ID copied" }));
    } catch {
      dispatch(pushToast({ tone: "error", title: "Couldn’t copy", description: "Copy the ID manually." }));
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Manage your organization and defaults for new websites." />

      {isError ? (
        <ErrorState title="We couldn’t load settings" onRetry={refetch} retrying={isFetching} />
      ) : (
        <div className="space-y-10 pb-24">
          <SettingsSection title="Organization" description="How your organization appears in Ryugaware.">
            {isLoading || !org ? (
              <div className="space-y-5">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <FormField label="Organization name" error={nameError}>
                  {(c) => <Input {...c} value={value("name")} onChange={(e) => edit("name", e.target.value)} maxLength={90} disabled={saving} />}
                </FormField>
                <FormField label="Organization ID" hint="Share this with support if you need help.">
                  {(c) => (
                    <Input
                      {...c}
                      mono
                      readOnly
                      value={org.id}
                      rightSlot={
                        <IconButton label="Copy organization ID" onClick={copyId}>
                          <Copy className="size-4" />
                        </IconButton>
                      }
                    />
                  )}
                </FormField>
              </div>
            )}
          </SettingsSection>

          <SettingsSection title="Website defaults" description="Applied to new websites. Existing websites keep their own settings.">
            {isLoading || !org || !options ? (
              <div className="space-y-5">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Default language" error={serverErrors.defaultLanguage}>
                    {(c) => <Select {...c} value={value("defaultLanguage")} options={options.languages} onChange={(e) => edit("defaultLanguage", e.target.value)} disabled={saving} />}
                  </FormField>
                  <FormField label="Default currency" error={serverErrors.defaultCurrency}>
                    {(c) => <Select {...c} value={value("defaultCurrency")} options={options.currencies} onChange={(e) => edit("defaultCurrency", e.target.value)} disabled={saving} />}
                  </FormField>
                </div>
                <FormField label="Default time zone" error={serverErrors.defaultTimezone} hint="Used for order timestamps and scheduled publishing.">
                  {(c) => <Select {...c} value={value("defaultTimezone")} options={options.timezones} onChange={(e) => edit("defaultTimezone", e.target.value)} disabled={saving} />}
                </FormField>
              </div>
            )}
          </SettingsSection>

          <SettingsSection title="Security" description="Password and signed-in devices.">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Password</p>
                  <p className="text-xs text-muted">{me ? `Last changed ${formatDate(me.passwordChangedAt)}` : "Loading…"}</p>
                </div>
                <Button variant="secondary" onClick={() => dispatch(openChangePassword())}>
                  Change password
                </Button>
              </div>
              <div className="border-t border-line pt-6">
                <h3 className="mb-3 text-sm font-medium">Active sessions</h3>
                <SessionsTable />
              </div>
            </div>
          </SettingsSection>
        </div>
      )}

      {dirty && (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-line bg-surface shadow-pop md:bottom-0 md:left-16 lg:left-60">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6 lg:px-8">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Info className="size-5 text-warning" aria-hidden /> You have unsaved changes
            </p>
            <div className="flex gap-3 max-sm:[&>button]:flex-1">
              <Button variant="ghost" onClick={() => { setServerErrors({}); dispatch(resetDraft()); }} disabled={saving}>
                Reset
              </Button>
              <Button onClick={onSave} loading={saving} disabled={Boolean(nameError)}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
