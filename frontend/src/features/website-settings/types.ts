/**
 * Per-website choices across the platform-wide sections.
 *
 * Payments, Delivery, Customer accounts and Storage are set up once for the organisation, under
 * their own sections. A website then picks which of those options it offers. The selection is not
 * copied here: it is the same `appliesTo` / `websiteIds` / override records those sections own,
 * read and written from the website's side, so the two views can never disagree.
 */
import type { CoverageType, DeliveryType, RateType } from "@/features/delivery/types";
import type { PaymentProvider, PaymentType } from "@/features/payments/types";
import type { StorageProvider, StorageStatus } from "@/features/storage/types";

export interface WebsitePaymentOption {
  id: string;
  type: PaymentType;
  provider: PaymentProvider;
  displayName: string;
  /** Switched on in the Payments section. A method that is off there is offered nowhere. */
  enabledGlobally: boolean;
  testMode: boolean;
  feePercent: number;
  feeFixed: number;
  minOrder: number | null;
  maxOrder: number | null;
  /** Offered on this website. */
  selected: boolean;
}

export interface WebsiteDeliveryOption {
  id: string;
  name: string;
  type: DeliveryType;
  carrier: string;
  minDays: number;
  maxDays: number;
  rateType: RateType;
  price: number;
  freeAbove: number | null;
  coverage: CoverageType;
  enabledGlobally: boolean;
  selected: boolean;
}

export interface WebsiteAuthOption {
  /** False means this website follows the organisation default. */
  overridden: boolean;
  email: boolean;
  google: boolean;
  defaultEmail: boolean;
  defaultGoogle: boolean;
  /** Google sign-in needs a client ID and secret in the Authentication section. */
  googleConfigured: boolean;
}

export interface WebsiteStorageOption {
  status: StorageStatus;
  provider: StorageProvider;
  bucket: string;
  /** This website keeps its media in the connected bucket rather than Ryugaware storage. */
  useConnected: boolean;
}

export interface WebsiteStoreSettings {
  websiteId: string;
  payments: WebsitePaymentOption[];
  delivery: WebsiteDeliveryOption[];
  auth: WebsiteAuthOption;
  storage: WebsiteStorageOption;
}

export interface StoreSettingsPatch {
  payment?: { id: string; selected: boolean };
  delivery?: { id: string; selected: boolean };
  auth?: { overridden: boolean; email?: boolean; google?: boolean };
  storage?: { useConnected: boolean };
}
