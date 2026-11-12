"use client";

import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Drawer } from "@/components/platform/Drawer";
import { ErrorState } from "@/components/platform/ErrorState";
import { FormField } from "@/components/platform/FormField";
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
import { useAddDeliveryMethodMutation, useGetDeliveryMethodQuery, useUpdateDeliveryMethodMutation } from "../api";
import {
  CARRIER_OPTIONS,
  COVERAGE_OPTIONS,
  DELIVERY_TYPE_DEFAULTS,
  DELIVERY_TYPE_OPTIONS,
  RATE_TYPE_OPTIONS,
  STATES,
} from "../constants";
import { DELIVERY_METHOD_FIELDS, deliveryMethodSchema, type DeliveryMethodOutput, type DeliveryMethodValues } from "../schemas";
import { closeMethodDrawer, requestDeleteMethod, selectMethodDrawer } from "../slice";
import type { DeliveryMethod, DeliveryType } from "../types";

export function MethodDrawer() {
  const drawer = useAppSelector(selectMethodDrawer);
  if (drawer.mode === "add") return <MethodForm />;
  if (drawer.mode === "edit") return <EditMethod key={drawer.methodId} methodId={drawer.methodId} />;
  return null;
}

/** Loads the method, then mounts the form with its values as defaults (so "dirty" means really changed). */
function EditMethod({ methodId }: { methodId: string }) {
  const dispatch = useAppDispatch();
  const { data, isLoading, isError, refetch, isFetching } = useGetDeliveryMethodQuery(methodId);
  if (data && !isLoading) return <MethodForm method={data} />;
  return (
    <Drawer open onClose={() => dispatch(closeMethodDrawer())} title="Edit delivery method">
      {isError ? (
        <ErrorState compact className="border-0" title="Couldn’t load this method" onRetry={refetch} retrying={isFetching} />
      ) : (
        <div className="space-y-5">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
    </Drawer>
  );
}

function toValues(m?: DeliveryMethod): DeliveryMethodValues {
  const d = DELIVERY_TYPE_DEFAULTS.standard;
  if (!m) {
    return {
      type: "standard",
      name: d.name,
      carrier: d.carrier,
      minDays: String(d.minDays),
      maxDays: String(d.maxDays),
      rateType: d.rateType,
      price: String(d.price),
      freeAbove: "",
      coverage: d.coverage,
      states: [],
      pincodes: "",
      allWebsites: true,
      websiteIds: [],
      enabled: true,
    };
  }
  return {
    type: m.type,
    name: m.name,
    carrier: m.carrier,
    minDays: String(m.minDays),
    maxDays: String(m.maxDays),
    rateType: m.rateType,
    price: m.rateType === "free" ? "" : String(m.price),
    freeAbove: m.freeAbove ? String(m.freeAbove) : "",
    coverage: m.coverage,
    states: m.coverage === "states" ? m.regions : [],
    pincodes: m.coverage === "pincodes" ? m.regions.join(", ") : "",
    allWebsites: m.websiteIds.length === 0,
    websiteIds: m.websiteIds,
    enabled: m.enabled,
  };
}

const DEFAULTED = ["name", "carrier", "minDays", "maxDays", "rateType", "price", "coverage"] as const;

function MethodForm({ method }: { method?: DeliveryMethod }) {
  const dispatch = useAppDispatch();
  const editing = Boolean(method);
  const [add, addState] = useAddDeliveryMethodMutation();
  const [update, updateState] = useUpdateDeliveryMethodMutation();
  const saving = addState.isLoading || updateState.isLoading;

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getFieldState,
    formState: { errors, isDirty },
  } = useForm<DeliveryMethodValues, unknown, DeliveryMethodOutput>({
    resolver: zodResolver(deliveryMethodSchema),
    defaultValues: toValues(method),
    mode: "onTouched",
  });
  const [rateType, coverage, allWebsites] = useWatch({ control, name: ["rateType", "coverage", "allWebsites"] });

  /** New methods: picking a type fills in that type's usual carrier, time and fee unless the merchant already edited them. */
  const onTypeChange = (type: DeliveryType, setType: (t: DeliveryType) => void) => {
    setType(type);
    if (editing) return;
    const d = DELIVERY_TYPE_DEFAULTS[type];
    for (const field of DEFAULTED) {
      if (!getFieldState(field).isDirty) setValue(field, typeof d[field] === "number" ? String(d[field]) : (d[field] as never));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (method) await update({ id: method.id, changes: values }).unwrap();
      else await add(values).unwrap(); // the slice closes the drawer on success
    } catch (e) {
      applyFieldErrors(e, DELIVERY_METHOD_FIELDS, setError);
    }
  });

  return (
    <Drawer
      open
      onClose={() => dispatch(closeMethodDrawer())}
      title={editing ? "Edit delivery method" : "Add delivery method"}
      description={editing ? method!.name : "Choose how orders are delivered and what it costs."}
      busy={saving}
      dirty={isDirty}
      footer={({ requestClose }) => (
        <>
          {method && (
            <Button variant="dangerGhost" leftIcon={<Trash2 className="size-4" />} onClick={() => dispatch(requestDeleteMethod(method.id))} className="mr-auto max-sm:hidden" disabled={saving}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="delivery-method-form" loading={saving}>
            {editing ? (saving ? "Saving…" : "Save changes") : saving ? "Adding…" : "Add method"}
          </Button>
        </>
      )}
    >
      <form id="delivery-method-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <span id="method-type-label" className="text-sm font-medium text-ink">
            Type
          </span>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <SegmentedControl
                ariaLabel="Delivery type"
                value={field.value}
                onChange={(t) => onTypeChange(t, field.onChange)}
                options={DELIVERY_TYPE_OPTIONS}
                className="w-full [&>button]:flex-1"
              />
            )}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Display name" required error={errors.name?.message} hint="Shown to customers at checkout.">
            {(c) => <Input {...c} {...register("name")} maxLength={40} autoComplete="off" />}
          </FormField>
          <FormField label="Carrier" required error={errors.carrier?.message}>
            {(c) => <Select id={c.id} invalid={c.invalid} aria-describedby={c["aria-describedby"]} options={CARRIER_OPTIONS} {...register("carrier")} />}
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          <FormField label="Min days" required error={errors.minDays?.message}>
            {(c) => <Input {...c} {...register("minDays")} inputMode="numeric" suffix="days" />}
          </FormField>
          <FormField label="Max days" required error={errors.maxDays?.message}>
            {(c) => <Input {...c} {...register("maxDays")} inputMode="numeric" suffix="days" />}
          </FormField>
          <p className="col-span-2 -mt-3 text-xs text-muted">Use 0 and 0 for same-day delivery or pickup ready the same day.</p>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1.5 text-sm font-medium text-ink">Fee</legend>
          <Controller
            control={control}
            name="rateType"
            render={({ field }) => <SegmentedControl ariaLabel="Fee type" value={field.value} onChange={field.onChange} options={RATE_TYPE_OPTIONS} className="w-full [&>button]:flex-1 [&>button]:px-2" />}
          />
          {rateType !== "free" && (
            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              <FormField label="Fee (₹)" required error={errors.price?.message}>
                {(c) => <Input {...c} {...register("price")} inputMode="numeric" leftIcon={<span className="text-sm">₹</span>} />}
              </FormField>
              {rateType === "free_above" && (
                <FormField label="Free above (₹)" required error={errors.freeAbove?.message} hint="Order total for free delivery.">
                  {(c) => <Input {...c} {...register("freeAbove")} inputMode="numeric" leftIcon={<span className="text-sm">₹</span>} />}
                </FormField>
              )}
            </div>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium text-ink">Coverage</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {COVERAGE_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-sm transition-colors",
                  coverage === o.value ? "border-primary bg-tint/40" : "border-line-strong hover:bg-subtle",
                )}
              >
                <input type="radio" value={o.value} {...register("coverage")} className="mt-0.5 accent-primary" />
                <span>
                  <span className="block font-medium text-ink">{o.label}</span>
                  <span className="block text-xs text-muted">{o.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {coverage === "states" && <StatesPicker control={control} error={errors.states?.message} />}
          {coverage === "pincodes" && (
            <FormField label="PIN codes or prefixes" required error={errors.pincodes?.message} hint="Separate with commas. A prefix like 4000 covers 400001–400099." className="mt-2">
              {(c) => <Input {...c} {...register("pincodes")} placeholder="400050, 4000, 5600" inputMode="numeric" mono autoComplete="off" />}
            </FormField>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium text-ink">Available on</legend>
          <Controller
            control={control}
            name="allWebsites"
            render={({ field }) => (
              <SegmentedControl
                ariaLabel="Websites"
                value={field.value ? "all" : "some"}
                onChange={(v) => field.onChange(v === "all")}
                options={[
                  { value: "all", label: "All websites" },
                  { value: "some", label: "Selected websites" },
                ]}
                className="w-full [&>button]:flex-1"
              />
            )}
          />
          {!allWebsites && <WebsitesPicker control={control} error={errors.websiteIds?.message} />}
        </fieldset>

        <Controller
          control={control}
          name="enabled"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-md border border-line p-3">
              <div>
                <p id="method-enabled-label" className="text-sm font-medium text-ink">
                  Show at checkout
                </p>
                <p className="text-xs text-muted">Turn off to hide it without deleting.</p>
              </div>
              <Switch checked={field.value} onCheckedChange={field.onChange} aria-labelledby="method-enabled-label" />
            </div>
          )}
        />

        {method && (
          <Button variant="dangerGhost" leftIcon={<Trash2 className="size-4" />} onClick={() => dispatch(requestDeleteMethod(method.id))} className="self-start sm:hidden">
            Delete method
          </Button>
        )}
      </form>
    </Drawer>
  );
}

function StatesPicker({ control, error }: { control: Control<DeliveryMethodValues, unknown, DeliveryMethodOutput>; error?: string }) {
  return (
    <Controller
      control={control}
      name="states"
      render={({ field }) => (
        <div className="mt-2" role="group" aria-label="States">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-line p-3">
            {STATES.map((s) => (
              <Checkbox
                key={s}
                label={s}
                checked={field.value.includes(s)}
                onChange={(e) => field.onChange(e.target.checked ? [...field.value, s] : field.value.filter((x) => x !== s))}
                onBlur={field.onBlur}
              />
            ))}
          </div>
          {error && <p className="mt-1.5 text-xs text-danger-hover">{error}</p>}
        </div>
      )}
    />
  );
}

function WebsitesPicker({ control, error }: { control: Control<DeliveryMethodValues, unknown, DeliveryMethodOutput>; error?: string }) {
  const { data: sites, isLoading } = useGetWebsiteOptionsQuery();
  return (
    <Controller
      control={control}
      name="websiteIds"
      render={({ field }) => (
        <div role="group" aria-label="Websites">
          <div className="flex flex-col gap-2 rounded-md border border-line p-3">
            {isLoading || !sites
              ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-4 w-1/2" />)
              : sites.map((w) => (
                  <Checkbox
                    key={w.id}
                    label={w.name}
                    checked={field.value.includes(w.id)}
                    onChange={(e) => field.onChange(e.target.checked ? [...field.value, w.id] : field.value.filter((x) => x !== w.id))}
                  />
                ))}
          </div>
          {error && <p className="mt-1.5 text-xs text-danger-hover">{error}</p>}
        </div>
      )}
    />
  );
}
