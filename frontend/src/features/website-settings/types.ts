/**
 * Per-website choices across the platform-wide sections.
 *
 * Payments and Delivery are set up once for the organisation, under their own sections. A website
 * then picks which of those options it offers at checkout. The selection is not copied here: it is
 * the `website_payment_methods` / `website_delivery_methods` link the backend owns, read and written
 * from the website's side, so the two views can never disagree.
 *
 * A brand-new website starts with one of each — cash on delivery and store pickup — and the customer
 * adds the rest from the editor. The backend refuses to leave a website with none.
 */
import type { CoverageType, DeliveryType, RateType } from "@/features/delivery/types";
import type { PaymentProvider, PaymentType } from "@/features/payments/types";

export interface WebsitePaymentOption {
  id: string;
  type: PaymentType;
  provider: PaymentProvider;
  displayName: string;
  /** Switched on in the Payments section. A method that is off there never reaches a shopper. */
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
  /** Human label for the partner behind the method ("Shiprocket", "Own fleet", "Store pickup"). */
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

export interface WebsiteStoreSettings {
  websiteId: string;
  payments: WebsitePaymentOption[];
  delivery: WebsiteDeliveryOption[];
}

/** One switch at a time: that is what the editor sends and what the optimistic update can undo. */
export interface StoreSettingsPatch {
  payment?: { id: string; selected: boolean };
  delivery?: { id: string; selected: boolean };
}
