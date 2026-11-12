import { z } from "zod";
import type { DeliveryMethodInput } from "./types";

/** A PIN code prefix: 2 to 6 digits, e.g. "4000" covers 400001–400099. */
export const PIN_PREFIX = /^\d{2,6}$/;

/** "400, 4110 ,560001" -> ["400", "4110", "560001"] (deduplicated, order kept). */
export function parsePinPrefixes(value: string) {
  return [...new Set(value.split(/[\s,;]+/).map((p) => p.trim()).filter(Boolean))];
}

const wholeNumber = /^\d+$/;

/**
 * The add / edit form works with strings for number inputs (so an empty box stays empty)
 * and converts to the API shape on submit.
 */
export const deliveryMethodSchema = z
  .object({
    type: z.enum(["standard", "express", "same_day", "pickup"]),
    name: z.string().trim().min(1, "Enter a name customers will see.").max(40, "Use 40 characters or fewer."),
    carrier: z.string().min(1, "Choose a carrier."),
    minDays: z.string().trim(),
    maxDays: z.string().trim(),
    rateType: z.enum(["flat", "free", "free_above"]),
    price: z.string().trim(),
    freeAbove: z.string().trim(),
    coverage: z.enum(["all_india", "metro", "states", "pincodes"]),
    states: z.array(z.string()),
    pincodes: z.string(),
    allWebsites: z.boolean(),
    websiteIds: z.array(z.string()),
    enabled: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    const min = Number(v.minDays);
    const max = Number(v.maxDays);
    if (!wholeNumber.test(v.minDays) || min > 30) issue("minDays", "Enter 0 to 30 days.");
    if (!wholeNumber.test(v.maxDays) || max > 30) issue("maxDays", "Enter 0 to 30 days.");
    else if (wholeNumber.test(v.minDays) && max < min) issue("maxDays", "Must be at least the minimum.");

    if (v.rateType !== "free") {
      const price = Number(v.price);
      if (!wholeNumber.test(v.price)) issue("price", "Enter a fee in whole rupees.");
      else if (price < 1 || price > 5000) issue("price", "Enter a fee between ₹1 and ₹5,000.");
    }
    if (v.rateType === "free_above") {
      if (!wholeNumber.test(v.freeAbove) || Number(v.freeAbove) < 1) issue("freeAbove", "Enter the order amount for free delivery.");
      else if (wholeNumber.test(v.price) && Number(v.freeAbove) <= Number(v.price)) issue("freeAbove", "Must be more than the fee.");
    }

    if (v.coverage === "states" && v.states.length === 0) issue("states", "Choose at least one state.");
    if (v.coverage === "pincodes") {
      const pins = parsePinPrefixes(v.pincodes);
      if (pins.length === 0) issue("pincodes", "Add at least one PIN code or prefix.");
      else if (pins.some((p) => !PIN_PREFIX.test(p))) issue("pincodes", "Use 2–6 digit PIN codes or prefixes, separated by commas.");
    }
    if (!v.allWebsites && v.websiteIds.length === 0) issue("websiteIds", "Choose at least one website.");
  })
  .transform(
    (v): DeliveryMethodInput => ({
      name: v.name,
      type: v.type,
      carrier: v.carrier,
      minDays: Number(v.minDays),
      maxDays: Number(v.maxDays),
      rateType: v.rateType,
      price: v.rateType === "free" ? 0 : Number(v.price),
      freeAbove: v.rateType === "free_above" ? Number(v.freeAbove) : null,
      coverage: v.coverage,
      regions: v.coverage === "states" ? v.states : v.coverage === "pincodes" ? parsePinPrefixes(v.pincodes) : [],
      websiteIds: v.allWebsites ? [] : v.websiteIds,
      enabled: v.enabled,
    }),
  );

export type DeliveryMethodValues = z.input<typeof deliveryMethodSchema>;
export type DeliveryMethodOutput = z.output<typeof deliveryMethodSchema>;

/** Form field names, for mapping server field errors. */
export const DELIVERY_METHOD_FIELDS = [
  "type", "name", "carrier", "minDays", "maxDays", "rateType", "price", "freeAbove", "coverage", "states", "pincodes", "websiteIds",
] as const;
