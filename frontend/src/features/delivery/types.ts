import type { Paginated } from "@/lib/api/types";

/* ───────────── Delivery methods ───────────── */

export type DeliveryType = "standard" | "express" | "same_day" | "pickup";
/** flat: always `price`; free: never charged; free_above: `price` unless the order is at least `freeAbove`. */
export type RateType = "flat" | "free" | "free_above";
/** Where a method is offered. `states` and `pincodes` use `regions`. */
export type CoverageType = "all_india" | "metro" | "states" | "pincodes";

export interface DeliveryMethod {
  id: string;
  name: string;
  type: DeliveryType;
  carrier: string;
  /** Delivery time in days. 0–0 means same day (or ready the same day for pickup). */
  minDays: number;
  maxDays: number;
  rateType: RateType;
  /** Fee in rupees (0 when rateType is "free"). */
  price: number;
  freeAbove: number | null;
  coverage: CoverageType;
  /** State names (coverage "states") or PIN code prefixes (coverage "pincodes"). */
  regions: string[];
  /** Websites this method is offered on. Empty = all websites. */
  websiteIds: string[];
  /** Resolved by the server for display. */
  websiteNames: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryMethodFilters {
  search: string;
  websiteId: string;
  status: "all" | "enabled" | "disabled";
  page: number;
  pageSize: number;
}

export interface DeliveryMethodCounts {
  all: number;
  enabled: number;
  disabled: number;
}

export type DeliveryMethodsResponse = Paginated<DeliveryMethod, { counts: DeliveryMethodCounts }>;

export interface DeliveryMethodInput {
  name: string;
  type: DeliveryType;
  carrier: string;
  minDays: number;
  maxDays: number;
  rateType: RateType;
  price: number;
  freeAbove: number | null;
  coverage: CoverageType;
  regions: string[];
  websiteIds: string[];
  enabled: boolean;
}

/* ───────────── Shipments ───────────── */

export type ShipmentStatus = "processing" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "returned";

/** One step on the shipment timeline. */
export type ShipmentEventCode =
  | "placed"
  | "packed"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned";

export interface ShipmentEvent {
  code: ShipmentEventCode;
  at: string;
  location: string;
  note?: string;
}

export interface ShipmentDestination {
  name: string;
  line: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  websiteId: string;
  websiteName: string;
  customerName: string;
  destination: ShipmentDestination;
  methodName: string;
  methodType: DeliveryType;
  carrier: string;
  /** Air waybill / tracking number. Null for store pickup or before pickup. */
  awb: string | null;
  trackingUrl: string | null;
  status: ShipmentStatus;
  itemCount: number;
  orderTotal: number;
  failureReason: string | null;
  eta: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentDetail extends Shipment {
  events: ShipmentEvent[];
}

export interface ShipmentFilters {
  search: string;
  status: ShipmentStatus | "all";
  methodType: DeliveryType | "all";
  websiteId: string;
  page: number;
  pageSize: number;
}

export type ShipmentCounts = Record<ShipmentStatus | "all", number>;

export type ShipmentsResponse = Paginated<Shipment, { counts: ShipmentCounts }>;

/** Manual status changes the merchant can make from the detail drawer. */
export type ShipmentAction = "ship" | "deliver" | "retry" | "return";
