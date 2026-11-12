import { z } from "zod";
import { EMPTY_CONTACT, INDIAN_STATES } from "./constants";
import type { ContactDetails, ContactInput } from "./types";

/** "+91 98200-12345" / "098200 12345" -> "9820012345". Anything else is returned as typed digits. */
export function normalisePhone(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 11 && d.startsWith("0")) return d.slice(1);
  return d;
}

/** "9820012345" -> "+91 98200 12345" */
export const formatPhone = (digits: string) => (digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : digits ? `+91 ${digits}` : "");

/** Landlines with STD code or mobiles: 10 digits, not starting with 0. */
export const PHONE_PATTERN = /^[1-9]\d{9}$/;
export const MOBILE_PATTERN = /^[6-9]\d{9}$/;
export const PIN_PATTERN = /^[1-9]\d{5}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const text = (max: number, label: string) => z.string().trim().max(max, `${label} can be up to ${max} characters.`);

export const contactSchema = z
  .object({
    businessName: text(80, "Business name").min(1, "Enter your business name."),
    contactPerson: text(60, "Contact person"),
    supportEmail: z.string().trim().min(1, "Enter a support email.").regex(EMAIL_PATTERN, "Enter an email like support@yourbrand.com."),
    phone: z
      .string()
      .transform(normalisePhone)
      .pipe(z.string().min(1, "Enter a phone number.").regex(PHONE_PATTERN, "Enter a 10-digit phone number.")),
    whatsappSameAsPhone: z.boolean(),
    whatsapp: z.string().transform(normalisePhone),
    supportHours: text(60, "Support hours"),
    addressLine1: text(100, "Address").min(1, "Enter the street address."),
    addressLine2: text(100, "Address"),
    city: text(50, "City").min(1, "Enter the city."),
    state: z.string().refine((s) => (INDIAN_STATES as readonly string[]).includes(s), "Choose a state."),
    pinCode: z.string().trim().regex(PIN_PATTERN, "Enter a 6-digit PIN code."),
    show: z.object({ footer: z.boolean(), contactPage: z.boolean(), invoices: z.boolean() }),
  })
  .superRefine((v, ctx) => {
    if (!v.whatsappSameAsPhone && v.whatsapp && !MOBILE_PATTERN.test(v.whatsapp)) {
      ctx.addIssue({ code: "custom", path: ["whatsapp"], message: "Enter a 10-digit mobile number." });
    }
    if (v.whatsappSameAsPhone && !MOBILE_PATTERN.test(v.phone)) {
      ctx.addIssue({ code: "custom", path: ["whatsappSameAsPhone"], message: "WhatsApp needs a mobile number. This phone looks like a landline." });
    }
  })
  .transform((v): ContactInput => ({ ...v, whatsapp: v.whatsappSameAsPhone ? "" : v.whatsapp }));

export type ContactValues = z.input<typeof contactSchema>;

export const CONTACT_FIELDS = [
  "businessName",
  "contactPerson",
  "supportEmail",
  "phone",
  "whatsappSameAsPhone",
  "whatsapp",
  "supportHours",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "pinCode",
] as const;

export function toContactValues(d: ContactDetails | ContactInput | null): ContactValues {
  const src = d ?? EMPTY_CONTACT;
  return {
    businessName: src.businessName,
    contactPerson: src.contactPerson,
    supportEmail: src.supportEmail,
    phone: src.phone,
    whatsappSameAsPhone: src.whatsappSameAsPhone,
    whatsapp: src.whatsapp,
    supportHours: src.supportHours,
    addressLine1: src.addressLine1,
    addressLine2: src.addressLine2,
    city: src.city,
    state: src.state,
    pinCode: src.pinCode,
    show: { ...src.show },
  };
}

/** One-line address for previews and summaries. */
export function formatAddress(d: Pick<ContactInput, "addressLine1" | "addressLine2" | "city" | "state" | "pinCode">) {
  const cityLine = [d.city, d.pinCode].filter(Boolean).join(" ");
  return [d.addressLine1, d.addressLine2, cityLine, d.state].filter((x) => x && x.trim()).join(", ");
}
