import type { StatusMap } from "@/components/platform/StatusBadge";
import type { SelectOption } from "@/components/ui/Select";
import { formatMoney } from "@/lib/format";
import type {
  CoverageType,
  DeliveryMethod,
  DeliveryType,
  RateType,
  ShipmentAction,
  ShipmentEventCode,
  ShipmentStatus,
} from "./types";

export const DELIVERY_TYPE_LABEL: Record<DeliveryType, string> = {
  standard: "Standard",
  express: "Express",
  same_day: "Same-day",
  pickup: "Store pickup",
};

export const DELIVERY_TYPE_OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "express", label: "Express" },
  { value: "same_day", label: "Same-day" },
  { value: "pickup", label: "Pickup" },
];

/** Sensible defaults when the merchant picks a type in the add drawer. */
export const DELIVERY_TYPE_DEFAULTS: Record<DeliveryType, { name: string; carrier: string; minDays: number; maxDays: number; rateType: RateType; price: number; coverage: CoverageType }> = {
  standard: { name: "Standard delivery", carrier: "Delhivery", minDays: 3, maxDays: 5, rateType: "flat", price: 60, coverage: "all_india" },
  express: { name: "Express delivery", carrier: "Blue Dart", minDays: 1, maxDays: 2, rateType: "flat", price: 149, coverage: "all_india" },
  same_day: { name: "Same-day delivery", carrier: "Local partner", minDays: 0, maxDays: 0, rateType: "flat", price: 99, coverage: "metro" },
  pickup: { name: "Store pickup", carrier: "Self", minDays: 0, maxDays: 0, rateType: "free", price: 0, coverage: "pincodes" },
};

export const CARRIERS = ["Delhivery", "Blue Dart", "DTDC", "Ecom Express", "Shadowfax", "XpressBees", "India Post", "Local partner", "Self"] as const;

export const CARRIER_OPTIONS: SelectOption[] = CARRIERS.map((c) => ({
  value: c,
  label: c === "Self" ? "Self (your own staff or store)" : c === "Local partner" ? "Local partner (city couriers)" : c,
}));

export const RATE_TYPE_OPTIONS: { value: RateType; label: string }[] = [
  { value: "flat", label: "Flat fee" },
  { value: "free_above", label: "Free above" },
  { value: "free", label: "Always free" },
];

export const COVERAGE_LABEL: Record<CoverageType, string> = {
  all_india: "All India",
  metro: "Metro cities",
  states: "Selected states",
  pincodes: "PIN codes",
};

export const COVERAGE_OPTIONS: { value: CoverageType; label: string; hint: string }[] = [
  { value: "all_india", label: "All India", hint: "Every serviceable PIN code" },
  { value: "metro", label: "Metro cities", hint: "8 metros incl. Mumbai, Delhi NCR, Bengaluru" },
  { value: "states", label: "Selected states", hint: "Only the states you pick" },
  { value: "pincodes", label: "PIN codes", hint: "Only the PIN code prefixes you list" },
];

export const METRO_CITIES = ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad"];

export const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Delhi", "Goa", "Gujarat", "Haryana", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal",
] as const;

export const METHOD_STATUS_OPTIONS: SelectOption<"all" | "enabled" | "disabled">[] = [
  { value: "all", label: "All methods" },
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

export const METHOD_PAGE_SIZES = [10, 25, 50];
export const SHIPMENT_PAGE_SIZES = [10, 25, 50];

/* ───────────── Display helpers (pure) ───────────── */

export function formatDeliveryTime(m: Pick<DeliveryMethod, "type" | "minDays" | "maxDays">) {
  if (m.maxDays === 0) return m.type === "pickup" ? "Ready same day" : "Same day";
  if (m.minDays === m.maxDays) return m.minDays === 1 ? "Next day" : `${m.minDays} days`;
  return `${m.minDays}–${m.maxDays} days`;
}

export function formatFee(m: Pick<DeliveryMethod, "rateType" | "price" | "freeAbove">) {
  if (m.rateType === "free" || m.price === 0) return "Free";
  if (m.rateType === "free_above" && m.freeAbove) return `${formatMoney(m.price)} · free above ${formatMoney(m.freeAbove)}`;
  return formatMoney(m.price);
}

export function formatCoverage(m: Pick<DeliveryMethod, "coverage" | "regions">) {
  if (m.coverage === "all_india" || m.coverage === "metro") return COVERAGE_LABEL[m.coverage];
  const list = m.regions;
  if (list.length === 0) return COVERAGE_LABEL[m.coverage];
  const noun = m.coverage === "states" ? (list.length === 1 ? "state" : "states") : list.length === 1 ? "PIN area" : "PIN areas";
  return list.length <= 2 ? list.join(", ") : `${list.length} ${noun}`;
}

export function formatAvailability(m: Pick<DeliveryMethod, "websiteIds" | "websiteNames">) {
  if (m.websiteIds.length === 0) return "All websites";
  if (m.websiteNames.length === 1) return m.websiteNames[0]!;
  return `${m.websiteNames.length} websites`;
}

/** Artwork for a delivery type (192×128 webp). */
export const typeMark = (type: DeliveryType) => `/images/marks/delivery-${type === "same_day" ? "same-day" : type}.webp`;

/** Carrier artwork: local couriers and self-delivery have their own marks, named carriers use the method type. */
export function carrierMark(carrier: string, type: DeliveryType) {
  if (carrier === "Self") return "/images/marks/carrier-self.webp";
  if (carrier === "Local partner" || carrier === "Local couriers") return "/images/marks/carrier-local.webp";
  return typeMark(type);
}

/* ───────────── Shipments ───────────── */

export const SHIPMENT_STATUS: StatusMap<ShipmentStatus> = {
  processing: { label: "Processing", tone: "neutral" },
  in_transit: { label: "In transit", tone: "warning" },
  out_for_delivery: { label: "Out for delivery", tone: "ember" },
  delivered: { label: "Delivered", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  returned: { label: "Returned", tone: "neutral" },
};

export const SHIPMENT_STATUS_OPTIONS: SelectOption<ShipmentStatus | "all">[] = [
  { value: "all", label: "All statuses" },
  ...(Object.keys(SHIPMENT_STATUS) as ShipmentStatus[]).map((s) => ({ value: s, label: SHIPMENT_STATUS[s].label })),
];

export const SHIPMENT_METHOD_OPTIONS: SelectOption<DeliveryType | "all">[] = [
  { value: "all", label: "All methods" },
  { value: "standard", label: "Standard" },
  { value: "express", label: "Express" },
  { value: "same_day", label: "Same-day" },
  { value: "pickup", label: "Store pickup" },
];

export const EVENT_LABEL: Record<ShipmentEventCode, string> = {
  placed: "Order placed",
  packed: "Packed",
  picked_up: "Shipped",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  failed: "Delivery failed",
  returned: "Returned to sender",
};

/** Pickup orders use store wording for the last two steps. */
export function eventLabel(code: ShipmentEventCode, type: DeliveryType) {
  if (type === "pickup" && code === "out_for_delivery") return "Ready for pickup";
  if (type === "pickup" && code === "delivered") return "Collected";
  return EVENT_LABEL[code];
}

/** Which manual actions are allowed from each status (the server enforces the same table). */
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentAction[]> = {
  processing: ["ship"],
  in_transit: ["deliver", "return"],
  out_for_delivery: ["deliver", "return"],
  failed: ["retry", "return"],
  delivered: [],
  returned: [],
};

const ACTION_RESULT: Record<ShipmentAction, ShipmentStatus> = {
  ship: "in_transit",
  deliver: "delivered",
  retry: "out_for_delivery",
  return: "returned",
};

export const isShipmentAction = (a: unknown): a is ShipmentAction => typeof a === "string" && a in ACTION_RESULT;

/** The status a manual action leads to. Pickup orders skip transit: "ship" means ready for pickup. */
export function actionResult(action: ShipmentAction, type: DeliveryType): ShipmentStatus {
  if (action === "ship" && type === "pickup") return "out_for_delivery";
  return ACTION_RESULT[action];
}

export const ACTION_LABEL: Record<ShipmentAction, (type: DeliveryType) => string> = {
  ship: (t) => (t === "pickup" ? "Mark ready for pickup" : "Mark as shipped"),
  deliver: (t) => (t === "pickup" ? "Mark as collected" : "Mark as delivered"),
  retry: () => "Retry delivery",
  return: () => "Mark as returned",
};
