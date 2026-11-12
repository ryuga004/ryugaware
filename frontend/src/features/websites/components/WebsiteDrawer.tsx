"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { Alert } from "@/components/platform/Alert";
import { Drawer } from "@/components/platform/Drawer";
import { ErrorState } from "@/components/platform/ErrorState";
import { FormField } from "@/components/platform/FormField";
import { TemplateShot } from "@/components/platform/TemplateShot";
import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { selectLimitReached } from "@/features/account/slice";
import { useGetTemplatesQuery } from "@/features/templates/api";
import { openTemplatePreview } from "@/features/templates/slice";
import { pushToast } from "@/features/ui/slice";
import { BASE_DOMAIN } from "@/lib/api/config";
import { isApiError } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useCreateWebsiteMutation, useGetWebsiteQuery, useLazyCheckSubdomainQuery, useUpdateWebsiteMutation } from "../api";
import { createWebsiteSchema, editWebsiteSchema, SUBDOMAIN_PATTERN, type CreateWebsiteValues, type EditWebsiteValues } from "../schemas";
import { closeDrawer, requestDelete, selectWebsiteDrawer } from "../slice";

/** Mounted once in the shell. Renders the create or edit drawer depending on Redux state. */
export function WebsiteDrawer() {
  const drawer = useAppSelector(selectWebsiteDrawer);
  if (drawer.mode === "create") return <CreateWebsiteDrawer templateId={drawer.templateId} />;
  if (drawer.mode === "edit") return <EditWebsiteDrawer websiteId={drawer.websiteId} />;
  return null;
}

/* -------------------------------------------------------------------------------------------------
 * Create
 * -----------------------------------------------------------------------------------------------*/

function CreateWebsiteDrawer({ templateId }: { templateId?: string }) {
  const dispatch = useAppDispatch();
  const limitReached = useAppSelector(selectLimitReached);
  const { data: templates, isLoading: templatesLoading, isError: templatesError, refetch } = useGetTemplatesQuery({ pageSize: 50 });
  const [createWebsite, { isLoading: creating }] = useCreateWebsiteMutation();
  const [checkSubdomain, check] = useLazyCheckSubdomainQuery();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, dirtyFields, isDirty },
  } = useForm<CreateWebsiteValues>({
    resolver: zodResolver(createWebsiteSchema),
    defaultValues: { templateId: templateId ?? "", name: "", subdomain: "" },
    mode: "onTouched",
  });

  const name = useWatch({ control, name: "name" });
  const subdomain = useWatch({ control, name: "subdomain" });
  const selectedTemplate = useWatch({ control, name: "templateId" });

  // Keep the address in sync with the name until the user edits it themselves.
  useEffect(() => {
    if (!dirtyFields.subdomain) setValue("subdomain", slugify(name), { shouldValidate: Boolean(name) });
  }, [name, dirtyFields.subdomain, setValue]);

  // Debounced availability check against the API. `settled` records the last address whose check finished,
  // so "checking" can be derived (no synchronous setState inside the effect).
  const [settled, setSettled] = useState("");
  const valid = SUBDOMAIN_PATTERN.test(subdomain);
  useEffect(() => {
    if (!valid) return;
    const t = setTimeout(() => {
      checkSubdomain(subdomain, true).finally(() => setSettled(subdomain));
    }, 400);
    return () => clearTimeout(t);
  }, [subdomain, valid, checkSubdomain]);

  const checkedCurrent = check.data?.subdomain === subdomain ? check.data : undefined;
  const checking = valid && settled !== subdomain;
  const available = valid && checkedCurrent?.available === true;

  const addressMessage = (() => {
    if (errors.subdomain?.message) return { error: errors.subdomain.message };
    if (checking) return { hint: "Checking availability…" };
    if (checkedCurrent && !checkedCurrent.available) return { error: `Already taken. Try ${checkedCurrent.suggestion}` };
    if (available) return { success: `${subdomain}.${BASE_DOMAIN} is available` };
    return { hint: "Lowercase letters, numbers and hyphens, 3–40 characters." };
  })();

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createWebsite(values).unwrap(); // the websites slice closes the drawer on success
    } catch (e) {
      if (isApiError(e) && e.data.fieldErrors) {
        for (const [field, message] of Object.entries(e.data.fieldErrors)) {
          if (field in values) setError(field as keyof CreateWebsiteValues, { message });
        }
      }
    }
  });

  const submitDisabled = limitReached || !available || checking;

  return (
    <Drawer
      open
      onClose={() => dispatch(closeDrawer())}
      title="New website"
      description="Start from a template. You can add your logo, products and domain after it’s created."
      busy={creating}
      dirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="secondary" onClick={requestClose} disabled={creating}>
            Cancel
          </Button>
          <Button type="submit" form="create-website-form" loading={creating} disabled={submitDisabled}>
            {creating ? "Creating…" : "Create website"}
          </Button>
        </>
      )}
    >
      <form id="create-website-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {limitReached && <Alert tone="warning">Your license has no websites left. Delete a website to create a new one.</Alert>}

        <FormField label="Template" error={errors.templateId?.message}>
          {() => (
            <Controller
              control={control}
              name="templateId"
              render={({ field }) => (
                <div role="radiogroup" aria-label="Template" className="flex flex-col gap-2">
                  {templatesLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                  {templatesError && <ErrorState title="Couldn’t load templates" onRetry={refetch} compact />}
                  {templates?.data.map((t) => {
                    const selected = field.value === t.id;
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "flex items-center gap-3 rounded-card border bg-surface p-3 transition-colors",
                          selected ? "border-primary ring-1 ring-primary" : "border-line hover:border-line-strong",
                        )}
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => field.onChange(t.id)}
                          disabled={creating}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className="w-16 shrink-0 overflow-hidden rounded border border-line">
                            <TemplateShot theme={t.thumbnailTheme} sizes="64px" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{t.name}</span>
                            <span className="block text-xs text-muted capitalize">{t.category}</span>
                          </span>
                        </button>
                        <button type="button" onClick={() => dispatch(openTemplatePreview(t.id))} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                          Preview <ExternalLink className="size-3" aria-hidden />
                        </button>
                        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", selected ? "bg-primary text-white" : "border border-line-strong")} aria-hidden>
                          {selected && <Check className="size-3" strokeWidth={3} />}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            />
          )}
        </FormField>

        <FormField label="Website name" error={errors.name?.message} hint={`${name.length} / 60 characters`}>
          {(c) => <Input {...c} placeholder="Bloom Studio" maxLength={80} disabled={creating} autoComplete="off" {...register("name")} />}
        </FormField>

        <FormField label="Web address" {...addressMessage}>
          {(c) => (
            <Input
              {...c}
              suffix={`.${BASE_DOMAIN}`}
              placeholder="bloom-studio"
              disabled={creating}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              rightSlot={checking ? <Loader2 className="size-4 animate-spin text-muted" aria-label="Checking" /> : null}
              {...register("subdomain", { setValueAs: (v: string) => v.toLowerCase() })}
            />
          )}
        </FormField>
        {checkedCurrent && !checkedCurrent.available && checkedCurrent.suggestion && (
          <button
            type="button"
            onClick={() => setValue("subdomain", checkedCurrent.suggestion!, { shouldDirty: true, shouldValidate: true })}
            className="-mt-3 self-start text-xs font-medium text-primary hover:underline"
          >
            Use {checkedCurrent.suggestion}
          </button>
        )}
        <span className="sr-only" aria-live="polite">
          {selectedTemplate ? "" : "Choose a template"}
        </span>
      </form>
    </Drawer>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Edit
 * -----------------------------------------------------------------------------------------------*/

function EditWebsiteDrawer({ websiteId }: { websiteId: string }) {
  const dispatch = useAppDispatch();
  const { data: website, isLoading, isError, refetch } = useGetWebsiteQuery(websiteId);
  const [updateWebsite, { isLoading: saving }] = useUpdateWebsiteMutation();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<EditWebsiteValues>({
    resolver: zodResolver(editWebsiteSchema),
    defaultValues: { name: "", paused: false },
    mode: "onTouched",
  });

  // Populate the form once the website arrives (and after each successful refresh when pristine).
  useEffect(() => {
    if (website) reset({ name: website.name, paused: website.status === "paused" });
  }, [website, reset]);

  useEffect(() => () => void (copyTimer.current && clearTimeout(copyTimer.current)), []);

  const onSubmit = handleSubmit(async (values) => {
    if (!website) return;
    const patch: { name?: string; paused?: boolean } = {};
    if (values.name !== website.name) patch.name = values.name;
    if (values.paused !== (website.status === "paused")) patch.paused = values.paused;
    try {
      await updateWebsite({ id: websiteId, patch }).unwrap();
    } catch (e) {
      if (isApiError(e) && e.data.fieldErrors?.name) setError("name", { message: e.data.fieldErrors.name });
    }
  });

  const host = website ? (website.customDomain ?? website.url.replace("https://", "")) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${host}`);
      setCopied(true);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      dispatch(pushToast({ tone: "error", title: "Couldn’t copy", description: "Copy the address manually." }));
    }
  };

  return (
    <Drawer
      open
      onClose={() => dispatch(closeDrawer())}
      title="Edit website"
      description={website?.name}
      busy={saving}
      dirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="secondary" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-website-form" loading={saving} disabled={!isDirty || !website}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </>
      )}
    >
      {isLoading && (
        <div className="space-y-5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
      {isError && <ErrorState title="Couldn’t load this website" onRetry={refetch} compact className="border-0" />}
      {website && (
        <form id="edit-website-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormField label="Website name" error={errors.name?.message}>
            {(c) => <Input {...c} disabled={saving} autoComplete="off" {...register("name")} />}
          </FormField>

          <FormField label="Web address" hint="Custom domains are managed in the website admin.">
            {(c) => (
              <Input
                {...c}
                readOnly
                value={host}
                rightSlot={
                  <IconButton label={copied ? "Copied" : "Copy address"} onClick={copy}>
                    {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                  </IconButton>
                }
              />
            )}
          </FormField>

          <div className="flex items-start justify-between gap-4 rounded-card border border-line bg-page p-4">
            <div>
              <p id="pause-label" className="text-sm font-medium">
                Pause website
              </p>
              <p className="mt-1 text-xs text-muted">Visitors will see a “temporarily unavailable” page. Your content is kept.</p>
            </div>
            <Controller control={control} name="paused" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} aria-labelledby="pause-label" disabled={saving} />} />
          </div>

          <div className="mt-4 border-t border-line pt-6">
            <p className="text-xs font-medium tracking-wide text-muted">DANGER ZONE</p>
            <p className="mt-2 text-xs text-muted">Deleting removes the website, its pages, products, orders and customer data.</p>
            <Button variant="dangerGhost" size="sm" className="mt-3 border border-danger-border" leftIcon={<Trash2 className="size-4" />} onClick={() => dispatch(requestDelete(websiteId))} disabled={saving}>
              Delete website
            </Button>
          </div>
        </form>
      )}
    </Drawer>
  );
}
