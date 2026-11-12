/** Shopper sign-in settings for the customer's websites (not the Ryugaware platform login). */

export type SessionDays = 1 | 7 | 30 | 90;

export interface EmailAuthSettings {
  enabled: boolean;
  allowSignups: boolean;
  requireVerification: boolean;
  /** 8–64 */
  minPasswordLength: number;
  sessionDays: SessionDays;
}

export interface GoogleAuthSettings {
  enabled: boolean;
  clientId: string;
  /** Masked, e.g. "••••••••3f9a"; null when no secret is saved. */
  clientSecretHint: string | null;
  /** Empty = any Google account. */
  allowedDomains: string[];
}

export interface AuthSettings {
  email: EmailAuthSettings;
  google: GoogleAuthSettings;
  updatedAt: string;
}

/** "default" or a website id. */
export type AuthScope = string;

export interface AuthOverrideSummary {
  websiteId: string;
  websiteName: string;
  updatedAt: string;
}

/** GET /customer-auth?scope= */
export interface AuthScopeResponse {
  scope: AuthScope;
  /** Website name for a website scope, null for the default. */
  websiteName: string | null;
  /** False until the default settings are first saved (onboarding). */
  configured: boolean;
  /** Website scope without its own settings: `settings` are the default's. */
  inherited: boolean;
  /** Effective settings for this scope (null only when not configured). */
  settings: AuthSettings | null;
  redirectUri: string;
  /** Websites with their own settings. */
  overrides: AuthOverrideSummary[];
}

/** PUT /customer-auth/:scope. An empty clientSecret keeps the saved one. */
export interface AuthSettingsInput {
  email: EmailAuthSettings;
  google: { enabled: boolean; clientId: string; clientSecret: string; allowedDomains: string[] };
}

export interface GoogleTestInput {
  scope: AuthScope;
  clientId: string;
  clientSecret: string;
  allowedDomains: string[];
}

export interface GoogleTestResult {
  ok: boolean;
  message: string;
  /** Signed-in test account on success. */
  account: string | null;
  testedAt: string;
}

/** Stored settings (public/data/customer-auth.json): the raw secret never leaves the dummy backend. */
export interface StoredAuthSettings extends Omit<AuthSettings, "google"> {
  google: Omit<GoogleAuthSettings, "clientSecretHint"> & { clientSecret: string | null };
}

export interface CustomerAuthDocument {
  default: StoredAuthSettings | null;
  overrides: Record<string, StoredAuthSettings>;
}
