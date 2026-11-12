import type { SelectOption } from "@/components/ui/Select";
import type { AuthSettingsInput } from "./types";

/** Where Google sends shoppers back after signing in. Customers add it to their OAuth client. */
export const GOOGLE_REDIRECT_URI = "https://auth.ryugaware.com/callback/google";

export const SESSION_OPTIONS: SelectOption[] = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 64;
export const MAX_ALLOWED_DOMAINS = 50;

/** Recommended starting point for the onboarding form. */
export const RECOMMENDED_AUTH: AuthSettingsInput = {
  email: { enabled: true, allowSignups: true, requireVerification: true, minPasswordLength: 8, sessionDays: 30 },
  google: { enabled: false, clientId: "", clientSecret: "", allowedDomains: [] },
};

export const GOOGLE_CLIENT_ID_PATTERN = /^[a-z0-9-]+\.apps\.googleusercontent\.com$/i;
/** Email domain such as yourcompany.com or partner.co.in */
export const EMAIL_DOMAIN_PATTERN = /^(?=.{4,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;
