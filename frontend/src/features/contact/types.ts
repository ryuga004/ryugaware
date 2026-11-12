/** Business contact details shown on the customer's websites (footer, contact page, invoices). */

export interface ContactVisibility {
  footer: boolean;
  contactPage: boolean;
  invoices: boolean;
}

export interface ContactInput {
  businessName: string;
  contactPerson: string;
  supportEmail: string;
  /** 10 digits without +91, e.g. "9820012345". */
  phone: string;
  whatsappSameAsPhone: boolean;
  /** 10-digit mobile, or "" for none. Ignored when whatsappSameAsPhone. */
  whatsapp: string;
  supportHours: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  /** 6 digits. */
  pinCode: string;
  show: ContactVisibility;
}

export interface ContactDetails extends ContactInput {
  updatedAt: string;
}

/** "default" or a website id. */
export type ContactScope = string;

export interface ContactOverrideSummary {
  websiteId: string;
  websiteName: string;
  updatedAt: string;
}

/** GET /contact?scope= */
export interface ContactScopeResponse {
  scope: ContactScope;
  websiteName: string | null;
  /** False until the default details are first saved. */
  configured: boolean;
  /** Website scope without its own details: `details` are the default's. */
  inherited: boolean;
  details: ContactDetails | null;
  overrides: ContactOverrideSummary[];
}

export interface ContactDocument {
  default: ContactDetails | null;
  overrides: Record<string, ContactDetails>;
}
