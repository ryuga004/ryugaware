import { z } from "zod";
import { EMAIL_DOMAIN_PATTERN, GOOGLE_CLIENT_ID_PATTERN, MAX_ALLOWED_DOMAINS, MAX_PASSWORD, MIN_PASSWORD } from "./constants";
import type { AuthSettings, AuthSettingsInput, SessionDays } from "./types";

/** "@Partner.org " -> "partner.org" */
export const normaliseDomain = (v: string) => v.trim().toLowerCase().replace(/^@/, "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");

/** `hasSavedSecret`: Google can stay on with an empty secret field only when a secret is already stored. */
export function authSchema(hasSavedSecret: boolean) {
  return z
    .object({
      email: z.object({
        enabled: z.boolean(),
        allowSignups: z.boolean(),
        requireVerification: z.boolean(),
        minPasswordLength: z
          .number({ error: `Enter a number from ${MIN_PASSWORD} to ${MAX_PASSWORD}.` })
          .int("Use a whole number.")
          .min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters.`)
          .max(MAX_PASSWORD, `Use at most ${MAX_PASSWORD} characters.`),
        sessionDays: z.enum(["1", "7", "30", "90"]),
      }),
      google: z.object({
        enabled: z.boolean(),
        clientId: z.string().trim(),
        clientSecret: z.string().trim(),
        allowedDomains: z
          .array(z.string().regex(EMAIL_DOMAIN_PATTERN, "Remove the domains that aren’t valid."))
          .max(MAX_ALLOWED_DOMAINS, `Add up to ${MAX_ALLOWED_DOMAINS} domains.`),
      }),
    })
    .superRefine((v, ctx) => {
      if (!v.google.enabled) return;
      if (!v.google.clientId) ctx.addIssue({ code: "custom", path: ["google", "clientId"], message: "Enter the client ID to enable Google sign-in." });
      else if (!GOOGLE_CLIENT_ID_PATTERN.test(v.google.clientId))
        ctx.addIssue({ code: "custom", path: ["google", "clientId"], message: "Client IDs end in .apps.googleusercontent.com." });
      if (!v.google.clientSecret && !hasSavedSecret)
        ctx.addIssue({ code: "custom", path: ["google", "clientSecret"], message: "Enter the client secret to enable Google sign-in." });
    })
    .transform(
      (v): AuthSettingsInput => ({
        email: { ...v.email, sessionDays: Number(v.email.sessionDays) as SessionDays },
        google: v.google,
      }),
    );
}

export type AuthValues = z.input<ReturnType<typeof authSchema>>;

export const AUTH_FIELDS = [
  "email.minPasswordLength",
  "email.sessionDays",
  "google.clientId",
  "google.clientSecret",
  "google.allowedDomains",
] as const;

export function toAuthValues(s: AuthSettings | AuthSettingsInput): AuthValues {
  return {
    email: { ...s.email, sessionDays: String(s.email.sessionDays) as AuthValues["email"]["sessionDays"] },
    google: { enabled: s.google.enabled, clientId: s.google.clientId, clientSecret: "", allowedDomains: [...s.google.allowedDomains] },
  };
}
