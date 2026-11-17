/**
 * Turns a website's store settings into what its storefront needs.
 *
 * One place decides what a shopper sees, so the live website, the editor preview and the checkout
 * cannot drift apart. Credentials, gateway fees and website scoping stay on this side of the line.
 */
import { DELIVERY_TYPE_LABEL } from "@/features/delivery/constants";
import { PAYMENT_PROVIDER, PAYMENT_TYPE } from "@/features/payments/constants";
import type { CheckoutDeliveryOption, CheckoutPaymentOption, StoreCommerce } from "@/features/storefront/types";
import type { DeliveryType } from "@/features/delivery/types";
import type { WebsiteDeliveryOption, WebsitePaymentOption, WebsiteStoreSettings } from "./types";

const DELIVERY_MARK: Record<DeliveryType, string> = {
  standard: "/images/marks/delivery-standard.webp",
  express: "/images/marks/delivery-express.webp",
  same_day: "/images/marks/delivery-same-day.webp",
  pickup: "/images/marks/delivery-pickup.webp",
};

const daysLabel = (min: number, max: number, type: DeliveryType) => {
  if (type === "pickup") return max === 0 ? "Ready today" : `Ready in ${max} days`;
  if (min === 0 && max === 0) return "Delivered today";
  if (min === max) return `${max} working ${max === 1 ? "day" : "days"}`;
  return `${min}–${max} working days`;
};

const paymentHint = (option: WebsitePaymentOption) => {
  if (option.type === "cod") return "Pay the courier when it arrives";
  if (option.provider === "offline") return "Paid directly";
  return PAYMENT_PROVIDER[option.provider].label;
};

export const toPaymentOption = (option: WebsitePaymentOption): CheckoutPaymentOption => ({
  id: option.id,
  kind: option.type,
  label: option.displayName || PAYMENT_TYPE[option.type].defaultName,
  hint: paymentHint(option),
  mark: PAYMENT_TYPE[option.type].mark,
  fee: option.type === "cod" ? option.feeFixed : 0,
  minOrder: option.minOrder,
  maxOrder: option.maxOrder,
  testMode: option.testMode,
});

export const toDeliveryOption = (option: WebsiteDeliveryOption): CheckoutDeliveryOption => ({
  id: option.id,
  name: option.name || DELIVERY_TYPE_LABEL[option.type],
  carrier: option.carrier,
  daysLabel: daysLabel(option.minDays, option.maxDays, option.type),
  maxDays: option.maxDays,
  rateType: option.rateType,
  price: option.price,
  freeAbove: option.freeAbove,
  mark: DELIVERY_MARK[option.type],
});

export function toCommerce(settings: WebsiteStoreSettings): StoreCommerce {
  return {
    payments: settings.payments.filter((p) => p.selected).map(toPaymentOption),
    delivery: settings.delivery.filter((d) => d.selected).map(toDeliveryOption),
    signIn: { email: settings.auth.email, google: settings.auth.google },
  };
}
