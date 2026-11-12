import type { SelectOption } from "@/components/ui/Select";
import type { ContactInput } from "./types";

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
] as const;

export const STATE_OPTIONS: SelectOption[] = INDIAN_STATES.map((s) => ({ value: s, label: s }));

export const EMPTY_CONTACT: ContactInput = {
  businessName: "",
  contactPerson: "",
  supportEmail: "",
  phone: "",
  whatsappSameAsPhone: true,
  whatsapp: "",
  supportHours: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pinCode: "",
  show: { footer: true, contactPage: true, invoices: true },
};

export const VISIBILITY_LABELS: { key: keyof ContactInput["show"]; title: string; description: string }[] = [
  { key: "footer", title: "Website footer", description: "Email, phone and address at the bottom of every page." },
  { key: "contactPage", title: "Contact page", description: "All details, the support hours and a map." },
  { key: "invoices", title: "Invoices and order emails", description: "Business name, address and support email." },
];
