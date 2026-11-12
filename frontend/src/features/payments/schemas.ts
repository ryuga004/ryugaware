import { z } from "zod";
import { PAYMENT_TYPES } from "./constants";
import type { PaymentMethodInput, PaymentProvider } from "./types";

/** Rupee / percent amounts typed into text inputs: digits with up to two decimals, or blank. */
export const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export const MAX_FEE_PERCENT = 10;
export const MAX_FIXED_FEE = 500;

const toNumber = (v: string) => (v === "" ? null : Number(v));

/**
 * Add / edit payment method form. Amounts are kept as strings while editing so a blank field stays blank;
 * the output is the API body. When `editing`, a blank key id / secret means "keep the stored one".
 */
export function makePaymentMethodSchema({ editing }: { editing: boolean }) {
  return z
    .object({
      type: z.enum(PAYMENT_TYPES),
      provider: z.string(),
      /** Blank means "use the suggested name" (filled in on submit). */
      displayName: z.string().trim().max(60, "Keep it under 60 characters."),
      testMode: z.boolean(),
      feePercent: z.string().trim(),
      feeFixed: z.string().trim(),
      minOrder: z.string().trim(),
      maxOrder: z.string().trim(),
      keyId: z.string().trim(),
      keySecret: z.string().trim(),
      appliesTo: z.enum(["all", "selected"]),
      websiteIds: z.array(z.string()),
      enabled: z.boolean(),
    })
    .superRefine((v, ctx) => {
      const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
      const amount = (path: "feePercent" | "feeFixed" | "minOrder" | "maxOrder", value: string, max?: number, label = "an amount") => {
        if (value === "") return;
        if (!AMOUNT_PATTERN.test(value)) issue(path, `Enter ${label} like 40 or 2.5.`);
        else if (max !== undefined && Number(value) > max) issue(path, `Must be ${max} or less.`);
      };
      if (v.type === "cod") {
        amount("feeFixed", v.feeFixed, MAX_FIXED_FEE);
        amount("minOrder", v.minOrder);
        amount("maxOrder", v.maxOrder);
        if (AMOUNT_PATTERN.test(v.minOrder) && AMOUNT_PATTERN.test(v.maxOrder) && Number(v.maxOrder) <= Number(v.minOrder)) {
          issue("maxOrder", "Must be more than the minimum order.");
        }
      } else {
        if (!v.provider) issue("provider", "Choose a provider.");
        if (v.feePercent === "") issue("feePercent", "Enter the percentage fee (0 if none).");
        else amount("feePercent", v.feePercent, MAX_FEE_PERCENT, "a percentage");
        amount("feeFixed", v.feeFixed, MAX_FIXED_FEE);
        if (!editing && !v.keyId) issue("keyId", "Paste the key ID from your gateway dashboard.");
        if (!editing && !v.keySecret) issue("keySecret", "Paste the key secret from your gateway dashboard.");
      }
      if (v.appliesTo === "selected" && v.websiteIds.length === 0) issue("websiteIds", "Choose at least one website.");
    })
    .transform(
      (v): PaymentMethodInput => ({
        type: v.type,
        provider: (v.type === "cod" ? "offline" : v.provider) as PaymentProvider,
        displayName: v.displayName,
        testMode: v.type === "cod" ? false : v.testMode,
        feePercent: v.type === "cod" ? 0 : Number(v.feePercent || 0),
        feeFixed: Number(v.feeFixed || 0),
        minOrder: v.type === "cod" ? toNumber(v.minOrder) : null,
        maxOrder: v.type === "cod" ? toNumber(v.maxOrder) : null,
        keyId: v.type === "cod" || !v.keyId ? undefined : v.keyId,
        keySecret: v.type === "cod" || !v.keySecret ? undefined : v.keySecret,
        appliesTo: v.appliesTo,
        websiteIds: v.appliesTo === "all" ? [] : v.websiteIds,
        enabled: v.enabled,
      }),
    );
}

export type PaymentMethodSchema = ReturnType<typeof makePaymentMethodSchema>;
export type PaymentMethodValues = z.input<PaymentMethodSchema>;
export type PaymentMethodOutput = z.output<PaymentMethodSchema>;

/** Form fields the server may return errors for. */
export const PAYMENT_METHOD_FIELDS = [
  "provider",
  "displayName",
  "feePercent",
  "feeFixed",
  "minOrder",
  "maxOrder",
  "keyId",
  "keySecret",
  "websiteIds",
] as const;
