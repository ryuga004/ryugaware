"use client";

import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/platform/Alert";
import { Drawer } from "@/components/platform/Drawer";
import { ErrorState } from "@/components/platform/ErrorState";
import { FormField } from "@/components/platform/FormField";
import { PasswordInput } from "@/components/platform/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { useGetWebsiteOptionsQuery } from "@/features/websites/api";
import { applyFieldErrors } from "@/lib/api/helpers";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useAddPaymentMethodMutation, useGetPaymentMethodQuery, useUpdatePaymentMethodMutation } from "../api";
import { PAYMENT_PROVIDER, PAYMENT_TYPE, PAYMENT_TYPES, TYPE_PROVIDERS } from "../constants";
import { makePaymentMethodSchema, PAYMENT_METHOD_FIELDS, type PaymentMethodOutput, type PaymentMethodValues } from "../schemas";
import { closeMethodDrawer, selectMethodDrawer } from "../slice";
import type { PaymentMethod, PaymentProvider, PaymentType } from "../types";
import { MethodMark } from "./MethodMark";

const FORM_ID = "payment-method-form";

export function MethodDrawer() {
  const drawer = useAppSelector(selectMethodDrawer);
  if (drawer.mode === "add") return <MethodForm preset={drawer.preset} />;
  if (drawer.mode === "edit") return <EditMethod id={drawer.methodId} />;
  return null;
}

/** Edit loads the method first (usually instant: the list seeds the cache before opening). */
function EditMethod({ id }: { id: string }) {
  const dispatch = useAppDispatch();
  const { data, isError, refetch, isFetching } = useGetPaymentMethodQuery(id);
  if (data) return <MethodForm key={data.id} method={data} />;
  return (
    <Drawer open onClose={() => dispatch(closeMethodDrawer())} title="Edit payment method">
      {isError ? (
        <ErrorState compact className="border-0" title="Couldn’t load this payment method" onRetry={refetch} retrying={isFetching} />
      ) : (
        <div className="space-y-5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}
    </Drawer>
  );
}

/** Name used when the display name is left blank (also the field placeholder). */
function defaultName(type: PaymentType, provider: string) {
  if (type === "cod") return "Cash on delivery";
  const p = PAYMENT_PROVIDER[provider as PaymentProvider];
  return p ? `${p.label} · ${PAYMENT_TYPE[type].plural}` : PAYMENT_TYPE[type].defaultName;
}

function toValues(m?: PaymentMethod, preset?: { type: PaymentType; provider: PaymentProvider }): PaymentMethodValues {
  const type = m?.type ?? preset?.type ?? "card";
  return {
    type,
    provider: m?.provider ?? preset?.provider ?? TYPE_PROVIDERS[type][0]!,
    displayName: m?.displayName ?? "",
    testMode: m?.testMode ?? false,
    feePercent: String(m?.feePercent ?? PAYMENT_TYPE[type].defaultFee),
    feeFixed: String(m?.feeFixed ?? (type === "cod" ? 40 : 0)),
    minOrder: m?.minOrder != null ? String(m.minOrder) : "",
    maxOrder: m?.maxOrder != null ? String(m.maxOrder) : "",
    keyId: "",
    keySecret: "",
    appliesTo: m?.appliesTo ?? "all",
    websiteIds: m?.websiteIds ?? [],
    enabled: m?.enabled ?? true,
  };
}

function MethodForm({ method, preset }: { method?: PaymentMethod; preset?: { type: PaymentType; provider: PaymentProvider } }) {
  const dispatch = useAppDispatch();
  const editing = Boolean(method);
  const [addMethod, addState] = useAddPaymentMethodMutation();
  const [updateMethod, updateState] = useUpdatePaymentMethodMutation();
  const saving = addState.isLoading || updateState.isLoading;

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<PaymentMethodValues, unknown, PaymentMethodOutput>({
    resolver: zodResolver(makePaymentMethodSchema({ editing })),
    defaultValues: toValues(method, preset),
    mode: "onTouched",
  });

  const [type, provider, testMode, appliesTo] = useWatch({ control, name: ["type", "provider", "testMode", "appliesTo"] });
  const cod = type === "cod";
  const providerInfo = PAYMENT_PROVIDER[provider as PaymentProvider] ?? PAYMENT_PROVIDER.razorpay;
  const providerChanged = editing && method!.type !== "cod" && provider !== method!.provider;

  const chooseType = (t: PaymentType) => {
    if (t === type) return;
    setValue("type", t, { shouldDirty: true });
    setValue("provider", TYPE_PROVIDERS[t][0]!, { shouldDirty: true });
    setValue("feePercent", String(PAYMENT_TYPE[t].defaultFee), { shouldDirty: true });
    setValue("feeFixed", t === "cod" ? "40" : "0", { shouldDirty: true });
    clearErrors();
  };

  const chooseProvider = (p: string) => {
    setValue("provider", p, { shouldDirty: true, shouldValidate: true });
    clearErrors(["keyId", "keySecret"]);
  };

  const onSubmit = handleSubmit(async (values) => {
    const body = { ...values, displayName: values.displayName || defaultName(values.type, values.provider) };
    try {
      if (method) await updateMethod({ id: method.id, patch: body }).unwrap();
      else await addMethod(body).unwrap(); // the slice closes the drawer on success
    } catch (e) {
      applyFieldErrors(e, PAYMENT_METHOD_FIELDS, setError);
    }
  });

  return (
    <Drawer
      open
      onClose={() => dispatch(closeMethodDrawer())}
      title={method ? `Edit ${method.displayName}` : "Add payment method"}
      description={method ? "Changes apply to checkout on your websites straight away." : "Choose how customers can pay and where it is available."}
      busy={saving}
      dirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="secondary" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving}>
            {saving ? "Saving…" : method ? "Save changes" : "Add method"}
          </Button>
        </>
      )}
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Type</legend>
          {editing ? (
            <div className="flex items-center gap-3 rounded-md border border-line bg-subtle p-2.5">
              <MethodMark type={type} />
              <div className="text-sm">
                <p className="font-medium text-ink">{type === "cod" ? "Cash on delivery" : PAYMENT_TYPE[type].label}</p>
                <p className="text-xs text-muted">The type can’t be changed. Add a new method instead.</p>
              </div>
            </div>
          ) : (
            <div role="radiogroup" aria-label="Payment type" className="flex flex-wrap gap-2">
              {PAYMENT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={type === t}
                  onClick={() => chooseType(t)}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
                    type === t ? "border-primary bg-primary text-white" : "border-line-strong bg-surface text-ink hover:bg-subtle",
                  )}
                >
                  {PAYMENT_TYPE[t].label}
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          {!cod && (
            <FormField label="Provider" required error={errors.provider?.message}>
              {(c) => (
                <Select
                  {...c}
                  value={provider}
                  onChange={(e) => chooseProvider(e.target.value)}
                  options={TYPE_PROVIDERS[type].map((p) => ({ value: p, label: PAYMENT_PROVIDER[p].label }))}
                />
              )}
            </FormField>
          )}
          <FormField label="Display name" error={errors.displayName?.message} hint="Shown to customers at checkout." className={cn(cod && "sm:col-span-2")}>
            {(c) => <Input {...c} {...register("displayName")} placeholder={defaultName(type, provider)} autoComplete="off" />}
          </FormField>
        </div>

        {!cod && (
          <div className="flex flex-col gap-1.5">
            <span id="mode-label" className="text-sm font-medium text-ink">
              Mode
            </span>
            <Controller
              control={control}
              name="testMode"
              render={({ field }) => (
                <SegmentedControl
                  ariaLabel="Mode"
                  value={field.value ? "test" : "live"}
                  onChange={(v) => {
                    field.onChange(v === "test");
                    clearErrors("keyId");
                  }}
                  options={[
                    { value: "test", label: "Test" },
                    { value: "live", label: "Live" },
                  ]}
                  className="self-start"
                />
              )}
            />
            <p className="text-xs text-muted">{testMode ? "Checkout works with test cards and UPI. No real money moves." : "Customers are charged for real."}</p>
          </div>
        )}

        {cod ? (
          <>
            <FormField label="COD fee (₹)" error={errors.feeFixed?.message} hint="Flat fee per cash order. Use 0 for free cash on delivery.">
              {(c) => <Input {...c} {...register("feeFixed")} inputMode="decimal" autoComplete="off" />}
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Minimum order (₹)" error={errors.minOrder?.message} hint="Optional.">
                {(c) => <Input {...c} {...register("minOrder")} inputMode="decimal" placeholder="No minimum" autoComplete="off" />}
              </FormField>
              <FormField label="Maximum order (₹)" error={errors.maxOrder?.message} hint="Optional.">
                {(c) => <Input {...c} {...register("maxOrder")} inputMode="decimal" placeholder="No maximum" autoComplete="off" />}
              </FormField>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Fee (%)" required error={errors.feePercent?.message}>
                {(c) => <Input {...c} {...register("feePercent")} inputMode="decimal" suffix="%" autoComplete="off" />}
              </FormField>
              <FormField label="Fixed fee (₹)" error={errors.feeFixed?.message}>
                {(c) => <Input {...c} {...register("feeFixed")} inputMode="decimal" autoComplete="off" />}
              </FormField>
            </div>
            <p className="-mt-3 text-xs text-muted">What {providerInfo.label} charges per payment. Used to work out your net revenue.</p>

            {providerChanged && <Alert tone="warning">Switching provider needs the new gateway’s key ID and secret.</Alert>}

            <FormField
              label={providerInfo.keyIdLabel}
              required={!editing || providerChanged}
              error={errors.keyId?.message}
              hint={editing && method!.keyIdMasked && !providerChanged ? `Current: ${method!.keyIdMasked}. Leave blank to keep it.` : `From your ${providerInfo.label} dashboard.`}
            >
              {(c) => (
                <Input {...c} {...register("keyId")} placeholder={providerInfo.keyIdPlaceholder(testMode)} autoComplete="off" autoCapitalize="none" spellCheck={false} mono />
              )}
            </FormField>
            <FormField
              label="Key secret"
              required={!editing || providerChanged}
              error={errors.keySecret?.message}
              hint={editing && method!.hasSecret && !providerChanged ? "Stored securely and never shown. Leave blank to keep it." : "Stored securely. You won’t be able to see it again."}
            >
              {(c) => <PasswordInput {...c} {...register("keySecret")} placeholder="Paste your secret" autoComplete="new-password" spellCheck={false} />}
            </FormField>
          </>
        )}

        <FormField label="Available on" error={errors.websiteIds?.message}>
          {(c) => (
            <Controller
              control={control}
              name="appliesTo"
              render={({ field }) => (
                <Select
                  id={c.id}
                  invalid={c.invalid}
                  aria-describedby={c["aria-describedby"]}
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    clearErrors("websiteIds");
                  }}
                  options={[
                    { value: "all", label: "All websites" },
                    { value: "selected", label: "Selected websites" },
                  ]}
                />
              )}
            />
          )}
        </FormField>
        {appliesTo === "selected" && <WebsiteChecklist control={control} />}

        <Controller
          control={control}
          name="enabled"
          render={({ field }) => (
            <div className="flex items-start gap-3">
              <Switch id="method-enabled" checked={field.value} onCheckedChange={field.onChange} aria-labelledby="method-enabled-label" />
              <div className="-mt-0.5">
                <label id="method-enabled-label" htmlFor="method-enabled" className="text-sm font-medium text-ink">
                  Enabled
                </label>
                <p className="text-xs text-muted">{field.value ? "Customers see it at checkout." : "Hidden at checkout until you enable it."}</p>
              </div>
            </div>
          )}
        />
      </form>
    </Drawer>
  );
}

function WebsiteChecklist({ control }: { control: Control<PaymentMethodValues, unknown, PaymentMethodOutput> }) {
  const { data: sites, isLoading } = useGetWebsiteOptionsQuery();
  return (
    <Controller
      control={control}
      name="websiteIds"
      render={({ field }) => {
        const selected = new Set(field.value);
        const toggle = (id: string, on: boolean) => {
          const next = new Set(selected);
          if (on) next.add(id);
          else next.delete(id);
          field.onChange([...next]);
        };
        return (
          <fieldset className="-mt-2 rounded-md border border-line p-3">
            <legend className="sr-only">Websites</legend>
            {isLoading || !sites ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ) : (
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {sites.map((w) => (
                  <li key={w.id}>
                    <Checkbox label={w.name} checked={selected.has(w.id)} onChange={(e) => toggle(w.id, e.target.checked)} onBlur={field.onBlur} />
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        );
      }}
    />
  );
}
