/**
 * Dummy backend routes for shopper sign-in settings (Authentication section).
 *   GET    /customer-auth?scope=default|<websiteId>   effective settings for the scope (secret masked)
 *   PUT    /customer-auth/:scope                      AuthSettingsInput; for a website this creates / updates its override
 *   DELETE /customer-auth/:scope                      website only: drop the override (inherit the default again)
 *   POST   /customer-auth/google/test                 simulated Google sign-in with the given client
 *
 * Simulated Google failures: a client ID that doesn't end in .apps.googleusercontent.com, one containing "redirect"
 * (redirect URI mismatch), or a secret containing "bad".
 */
import { badRequest, notFound } from "@/lib/api/dummy/errors";
import { db } from "@/lib/api/dummy/db";
import { isoAgo } from "@/lib/api/dummy/fake";
import { registerRoutes } from "@/lib/api/dummy/router";
import { registerScenario } from "@/lib/api/dummy/scenario";
import { nowIso } from "@/lib/api/dummy/utils";
import type { Website } from "@/features/websites/types";
import { EMAIL_DOMAIN_PATTERN, GOOGLE_CLIENT_ID_PATTERN, GOOGLE_REDIRECT_URI, MAX_ALLOWED_DOMAINS, MAX_PASSWORD, MIN_PASSWORD } from "./constants";
import { normaliseDomain } from "./schemas";
import type { AuthScopeResponse, AuthSettings, AuthSettingsInput, CustomerAuthDocument, GoogleTestInput, GoogleTestResult, SessionDays, StoredAuthSettings } from "./types";

const FILE = "customer-auth";
const doc = () => db.document<CustomerAuthDocument>(FILE);

const LARGE_DOMAINS = [
  "bloomstudio.com", "bloomstudio.in", "bloom-retail.co.in", "northwindcoffee.co", "atlasoutdoor.in", "freshbasket.in",
  "lotusyoga.in", "kalahandloom.com", "mehtaclinic.in", "spiceroutepantry.com", "partners.bloomstudio.com",
  "wholesale.freshbasket.in", "staff.atlasoutdoor.in", "studio-associates.org", "ryugaware-demo.com", "example-partner.co.uk",
];

const settings = (over: { email?: Partial<StoredAuthSettings["email"]>; google?: Partial<StoredAuthSettings["google"]> }, minutesAgo: number): StoredAuthSettings => ({
  email: { enabled: true, allowSignups: true, requireVerification: true, minPasswordLength: 8, sessionDays: 30, ...over.email },
  google: { enabled: false, clientId: "", clientSecret: null, allowedDomains: [], ...over.google },
  updatedAt: isoAgo(minutesAgo),
});

registerScenario<CustomerAuthDocument>(FILE, {
  // Nothing set up: onboarding.
  empty: () => ({ default: null, overrides: {} }),
  // Email and password only, no website overrides.
  small: () => ({ default: settings({}, 60 * 24 * 3), overrides: {} }),
  // Google with a long allow-list and an override for almost every website.
  large: (seed) => {
    const google = { enabled: true, clientId: seed.default!.google.clientId, clientSecret: seed.default!.google.clientSecret, allowedDomains: LARGE_DOMAINS };
    return {
      default: settings({ google }, 60 * 5),
      overrides: {
        web_01J8A1: settings({ email: { minPasswordLength: 10 }, google: { ...google, allowedDomains: LARGE_DOMAINS.slice(0, 3) } }, 60 * 24),
        web_01J8A3: settings({ email: { sessionDays: 90 }, google }, 60 * 30),
        web_01J8A4: settings({ email: { requireVerification: false, sessionDays: 7 } }, 60 * 50),
        web_01J8A5: settings({ email: { allowSignups: false } }, 60 * 80),
        web_01J8A6: settings({ email: { enabled: false }, google: { ...google, allowedDomains: ["kalahandloom.com"] } }, 60 * 120),
        web_01J8A7: settings({ email: { minPasswordLength: 16, sessionDays: 1 }, google: { ...google, allowedDomains: ["mehtaclinic.in"] } }, 60 * 200),
        web_01J8A8: settings({ email: { minPasswordLength: 12 }, google: { ...google, allowedDomains: LARGE_DOMAINS.slice(4, 14) } }, 60 * 260),
      },
    };
  },
});

const mask = (secret: string | null) => (secret ? `••••••••${secret.slice(-4)}` : null);

function toPublic(s: StoredAuthSettings): AuthSettings {
  const { clientSecret, ...google } = s.google;
  return { ...s, google: { ...google, clientSecretHint: mask(clientSecret) } };
}

async function websites() {
  return db.collection<Website>("websites");
}

async function websiteFor(scope: string) {
  if (scope === "default") return null;
  const site = (await websites()).find((w) => w.id === scope);
  if (!site) throw notFound("Website");
  return site;
}

async function respond(scope: string): Promise<AuthScopeResponse> {
  const d = await doc();
  const site = await websiteFor(scope);
  const sites = await websites();
  const own = site ? d.overrides[site.id] : d.default;
  const effective = own ?? d.default;
  return {
    scope,
    websiteName: site?.name ?? null,
    configured: d.default !== null,
    inherited: Boolean(site) && !own,
    settings: effective ? toPublic(effective) : null,
    redirectUri: GOOGLE_REDIRECT_URI,
    overrides: Object.entries(d.overrides)
      .map(([websiteId, s]) => ({ websiteId, websiteName: sites.find((w) => w.id === websiteId)?.name ?? websiteId, updatedAt: s.updatedAt }))
      .sort((a, b) => a.websiteName.localeCompare(b.websiteName)),
  };
}

function validate(raw: Partial<AuthSettingsInput>, savedSecret: string | null): StoredAuthSettings {
  const e = raw.email ?? ({} as Partial<AuthSettingsInput["email"]>);
  const g = raw.google ?? ({} as Partial<AuthSettingsInput["google"]>);
  const fe: Record<string, string> = {};
  const emailEnabled = Boolean(e.enabled);
  const googleEnabled = Boolean(g.enabled);
  if (!emailEnabled && !googleEnabled) {
    throw badRequest("Keep at least one sign-in method on. To stop new accounts, turn off “Allow new sign-ups” instead.");
  }
  const min = Number(e.minPasswordLength);
  if (!Number.isInteger(min) || min < MIN_PASSWORD || min > MAX_PASSWORD) fe["email.minPasswordLength"] = `Enter a number from ${MIN_PASSWORD} to ${MAX_PASSWORD}.`;
  const days = Number(e.sessionDays);
  if (![1, 7, 30, 90].includes(days)) fe["email.sessionDays"] = "Choose a session length.";
  const clientId = String(g.clientId ?? "").trim();
  const secret = String(g.clientSecret ?? "").trim() || savedSecret;
  const domains = [...new Set((g.allowedDomains ?? []).map((x) => normaliseDomain(String(x))).filter(Boolean))];
  if (googleEnabled) {
    if (!clientId) fe["google.clientId"] = "Enter the client ID to enable Google sign-in.";
    else if (!GOOGLE_CLIENT_ID_PATTERN.test(clientId)) fe["google.clientId"] = "Client IDs end in .apps.googleusercontent.com.";
    if (!secret) fe["google.clientSecret"] = "Enter the client secret to enable Google sign-in.";
  }
  if (domains.length > MAX_ALLOWED_DOMAINS) fe["google.allowedDomains"] = `Add up to ${MAX_ALLOWED_DOMAINS} domains.`;
  else if (domains.some((x) => !EMAIL_DOMAIN_PATTERN.test(x))) fe["google.allowedDomains"] = "Remove the domains that aren’t valid.";
  if (Object.keys(fe).length) throw badRequest("Please fix the highlighted fields.", fe);
  return {
    email: {
      enabled: emailEnabled,
      allowSignups: Boolean(e.allowSignups),
      requireVerification: Boolean(e.requireVerification),
      minPasswordLength: min,
      sessionDays: days as SessionDays,
    },
    google: { enabled: googleEnabled, clientId, clientSecret: secret, allowedDomains: domains },
    updatedAt: nowIso(),
  };
}

registerRoutes([
  {
    method: "GET",
    path: "/customer-auth",
    handler: async ({ query }) => ({ data: await respond(String(query.scope || "default")) }),
  },
  {
    method: "POST",
    path: "/customer-auth/google/test",
    handler: async ({ body }): Promise<{ data: GoogleTestResult }> => {
      const input = (body ?? {}) as Partial<GoogleTestInput>;
      const d = await doc();
      const scope = String(input.scope || "default");
      await websiteFor(scope);
      const saved = (scope !== "default" ? d.overrides[scope] : null) ?? d.default;
      const clientId = String(input.clientId ?? "").trim();
      const secret = String(input.clientSecret ?? "").trim() || saved?.google.clientSecret || "";
      const fe: Record<string, string> = {};
      if (!clientId) fe["google.clientId"] = "Enter the client ID first.";
      if (!secret) fe["google.clientSecret"] = "Enter the client secret first.";
      if (Object.keys(fe).length) throw badRequest("Add the client ID and secret to test Google sign-in.", fe);
      const fail = (message: string): { data: GoogleTestResult } => ({ data: { ok: false, message, account: null, testedAt: nowIso() } });
      if (!GOOGLE_CLIENT_ID_PATTERN.test(clientId)) return fail("Google didn’t recognise this client ID (invalid_client). Copy it again from Google Cloud › Credentials.");
      if (clientId.includes("redirect")) return fail(`redirect_uri_mismatch: add ${GOOGLE_REDIRECT_URI} under “Authorized redirect URIs” for this client.`);
      if (secret.includes("bad")) return fail("Google rejected the client secret (invalid_client). Create a new secret and paste it here.");
      const domain = (input.allowedDomains ?? [])[0];
      const account = `test.shopper@${domain || "gmail.com"}`;
      return { data: { ok: true, message: `Signed in as ${account} and returned to ${GOOGLE_REDIRECT_URI}.`, account, testedAt: nowIso() } };
    },
  },
  {
    method: "PUT",
    path: "/customer-auth/:scope",
    handler: async ({ params, body }) => {
      const d = await doc();
      const site = await websiteFor(params.scope);
      if (site && !d.default) throw badRequest("Save the default settings first.");
      // A new website override starts from the default's secret, so "keep the saved secret" still works.
      const current = site ? (d.overrides[site.id] ?? d.default) : d.default;
      const next = validate((body ?? {}) as Partial<AuthSettingsInput>, current?.google.clientSecret ?? null);
      if (site) d.overrides[site.id] = next;
      else d.default = next;
      return { data: await respond(params.scope) };
    },
  },
  {
    method: "DELETE",
    path: "/customer-auth/:scope",
    handler: async ({ params }) => {
      const d = await doc();
      const site = await websiteFor(params.scope);
      if (!site) throw badRequest("The default settings can’t be reset.");
      delete d.overrides[site.id];
      return { data: await respond(params.scope) };
    },
  },
]);
