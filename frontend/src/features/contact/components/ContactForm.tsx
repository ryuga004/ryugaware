"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/platform/FormField";
import { SaveBar } from "@/components/platform/SaveBar";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { applyFieldErrors } from "@/lib/api/helpers";
import { useAppDispatch } from "@/store/hooks";
import { useSaveContactDetailsMutation } from "../api";
import { STATE_OPTIONS, VISIBILITY_LABELS } from "../constants";
import { CONTACT_FIELDS, contactSchema, formatPhone, normalisePhone, toContactValues, type ContactValues } from "../schemas";
import { cancelContactSetup, cancelCustomizing } from "../slice";
import type { ContactInput, ContactScopeResponse } from "../types";
import { ContactPreview } from "./ContactPreview";

const FORM_ID = "contact-form";

export type ContactFormMode = "setup" | "edit" | "customize";

/**
 * Contact details form with the live preview beside it.
 * setup: first time (blank). customize: an inheriting website, prefilled from the default. edit: saved details.
 */
export function ContactForm({
  response,
  mode,
  header,
  aside,
}: {
  response: ContactScopeResponse;
  mode: ContactFormMode;
  /** Scope row and alerts; receives whether the form has unsaved edits. */
  header?: (dirty: boolean) => React.ReactNode;
  /** Extra cards under the preview; receives whether the form has unsaved edits. */
  aside?: (dirty: boolean) => React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const [save, { isLoading: saving }] = useSaveContactDetailsMutation();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ContactValues, unknown, ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: toContactValues(mode === "setup" ? null : response.details),
    mode: "onTouched",
  });

  useEffect(() => {
    reset(toContactValues(mode === "setup" ? null : response.details));
  }, [response, mode, reset]);

  const values = useWatch({ control });
  const sameAsPhone = values.whatsappSameAsPhone ?? true;

  const onSave = handleSubmit(async (input) => {
    try {
      await save({ scope: response.scope, input }).unwrap();
    } catch (e) {
      applyFieldErrors(e, CONTACT_FIELDS, setError);
    }
  });

  const onReset = () => {
    if (mode === "setup") dispatch(cancelContactSetup());
    else if (mode === "customize") dispatch(cancelCustomizing());
    else reset();
  };

  const title = response.websiteName ?? (values.businessName?.trim() || "Your business");
  const saveLabel = mode === "setup" ? "Save contact details" : mode === "customize" ? `Save for ${response.websiteName}` : "Save changes";

  const section = (heading: string, children: React.ReactNode, first?: boolean) => (
    <fieldset className={first ? "" : "border-t border-line pt-6"}>
      <legend className="float-left mb-4 w-full font-heading text-base font-semibold text-ink">{heading}</legend>
      <div className="clear-both flex flex-col gap-5">{children}</div>
    </fieldset>
  );

  return (
    <>
      {header?.(isDirty)}
      <div className="grid gap-8 pb-24 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:grid-cols-[minmax(0,1fr)_340px]">
        <form id={FORM_ID} onSubmit={onSave} noValidate className="flex flex-col gap-6 rounded-card border border-line bg-surface p-5 sm:p-6">
          {section(
            "Business",
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Business name" required error={errors.businessName?.message}>
                {(c) => <Input {...c} {...register("businessName")} placeholder="Your business name" autoComplete="organization" maxLength={80} />}
              </FormField>
              <FormField label="Contact person" error={errors.contactPerson?.message}>
                {(c) => <Input {...c} {...register("contactPerson")} placeholder="Full name" autoComplete="name" maxLength={60} />}
              </FormField>
            </div>,
            true,
          )}

          {section(
            "Support",
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Support email" required error={errors.supportEmail?.message}>
                {(c) => <Input {...c} {...register("supportEmail")} type="email" placeholder="support@yourbrand.com" autoComplete="email" spellCheck={false} />}
              </FormField>
              <FormField label="Phone" required error={errors.phone?.message} hint="Mobile or landline with STD code.">
                {(c) => (
                  <Input {...c} {...register("phone")} type="tel" inputMode="tel" placeholder="98200 12345" autoComplete="tel-national" leftIcon={<span className="text-sm">+91</span>} />
                )}
              </FormField>
              <FormField
                label="WhatsApp (optional)"
                error={errors.whatsapp?.message ?? errors.whatsappSameAsPhone?.message}
                labelAction={
                  <Controller
                    control={control}
                    name="whatsappSameAsPhone"
                    render={({ field }) => (
                      <span className="flex items-center gap-2">
                        <span id="contact-wa-same" className="text-xs text-muted">
                          Same as phone
                        </span>
                        <Switch checked={field.value} onCheckedChange={field.onChange} aria-labelledby="contact-wa-same" />
                      </span>
                    )}
                  />
                }
              >
                {(c) =>
                  sameAsPhone ? (
                    <Input {...c} readOnly value={formatPhone(normalisePhone(values.phone ?? "")) || "Uses the phone number"} />
                  ) : (
                    <Input {...c} {...register("whatsapp")} type="tel" inputMode="tel" placeholder="98200 12345" leftIcon={<span className="text-sm">+91</span>} />
                  )
                }
              </FormField>
              <FormField label="Support hours" error={errors.supportHours?.message}>
                {(c) => <Input {...c} {...register("supportHours")} placeholder="Mon–Fri, 9 am – 6 pm" maxLength={60} />}
              </FormField>
            </div>,
          )}

          {section(
            "Address",
            <>
              <FormField label="Address line 1" required error={errors.addressLine1?.message}>
                {(c) => <Input {...c} {...register("addressLine1")} placeholder="Building, street" autoComplete="address-line1" maxLength={100} />}
              </FormField>
              <FormField label="Address line 2" error={errors.addressLine2?.message}>
                {(c) => <Input {...c} {...register("addressLine2")} placeholder="Area, landmark (optional)" autoComplete="address-line2" maxLength={100} />}
              </FormField>
              <div className="grid gap-5 sm:grid-cols-3">
                <FormField label="City" required error={errors.city?.message}>
                  {(c) => <Input {...c} {...register("city")} autoComplete="address-level2" maxLength={50} />}
                </FormField>
                <FormField label="State" required error={errors.state?.message}>
                  {(c) => <Select {...c} {...register("state")} options={STATE_OPTIONS} placeholder="Choose a state" />}
                </FormField>
                <FormField label="PIN code" required error={errors.pinCode?.message}>
                  {(c) => <Input {...c} {...register("pinCode")} inputMode="numeric" autoComplete="postal-code" maxLength={6} placeholder="400050" />}
                </FormField>
              </div>
            </>,
          )}

          {section(
            "Show on your websites",
            VISIBILITY_LABELS.map((v) => (
              <Controller
                key={v.key}
                control={control}
                name={`show.${v.key}`}
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p id={`contact-show-${v.key}`} className="text-sm font-medium text-ink">
                        {v.title}
                      </p>
                      <p className="text-xs text-muted">{v.description}</p>
                    </div>
                    <Switch checked={field.value} onCheckedChange={field.onChange} aria-labelledby={`contact-show-${v.key}`} />
                  </div>
                )}
              />
            )),
          )}
        </form>

        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <ContactPreview values={values} title={title} />
          {aside?.(isDirty)}
        </div>
      </div>

      <SaveBar dirty={mode !== "edit" || isDirty} saving={saving} onReset={onReset} formId={FORM_ID} saveLabel={saveLabel} />
    </>
  );
}
