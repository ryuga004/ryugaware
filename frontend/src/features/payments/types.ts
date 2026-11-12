import type { Paginated } from "@/lib/api/types";

/* ───────────────────────── Payment methods ───────────────────────── */

export type PaymentType = "card" | "upi" | "netbanking" | "wallet" | "cod";
export type PaymentProvider = "razorpay" | "payu" | "cashfree" | "phonepe" | "paytm" | "offline";
/** Where the method is offered: every website, or only the listed ones. */
export type PaymentScope = "all" | "selected";

export interface PaymentMethod {
  id: string;
  type: PaymentType;
  provider: PaymentProvider;
  displayName: string;
  enabled: boolean;
  /** Test keys: checkout works but no real money moves. Always false for cash on delivery. */
  testMode: boolean;
  /** What the gateway charges per payment (percent of the amount). 0 for cash on delivery. */
  feePercent: number;
  /** Flat fee per payment in rupees. For cash on delivery this is the COD fee. */
  feeFixed: number;
  /** Cash on delivery only: order value limits in rupees. */
  minOrder: number | null;
  maxOrder: number | null;
  appliesTo: PaymentScope;
  websiteIds: string[];
  /** Names of `websiteIds`, resolved by the server. */
  websiteNames: string[];
  /** The API key id with the middle hidden, e.g. rzp_live_••••K2M4. Null for cash on delivery. */
  keyIdMasked: string | null;
  /** The secret is write-only: the server only says whether one is stored. */
  hasSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodFilters {
  search: string;
  type: PaymentType | "all";
  websiteId: string;
  page: number;
  pageSize: number;
}

export interface PaymentMethodCounts {
  all: number;
  enabled: number;
}

export type PaymentMethodsResponse = Paginated<PaymentMethod, { counts: PaymentMethodCounts }>;

/** Body for POST /payments/methods and PATCH /payments/methods/:id (all fields optional on PATCH). */
export interface PaymentMethodInput {
  type: PaymentType;
  provider: PaymentProvider;
  displayName: string;
  testMode: boolean;
  feePercent: number;
  feeFixed: number;
  minOrder: number | null;
  maxOrder: number | null;
  /** Omit (or leave empty) on PATCH to keep the stored key. */
  keyId?: string;
  keySecret?: string;
  appliesTo: PaymentScope;
  websiteIds: string[];
  enabled: boolean;
}

/* ───────────────────────── Transactions ───────────────────────── */

export type TransactionStatus = "succeeded" | "pending" | "failed" | "refunded";
export type TransactionRange = "7d" | "30d" | "90d" | "all";

export interface Transaction {
  /** Gateway payment id, e.g. pay_8KJ2M9. */
  id: string;
  orderId: string;
  websiteId: string;
  websiteName: string;
  customerName: string;
  customerEmail: string;
  methodType: PaymentType;
  /** How the customer paid, e.g. "Visa •••• 4242" or "Net banking · HDFC". */
  methodLabel: string;
  /** Who processed it, e.g. "Razorpay". */
  providerLabel: string;
  amount: number;
  fee: number;
  status: TransactionStatus;
  failureReason: string | null;
  createdAt: string;
  refundedAt: string | null;
}

export interface TimelineStep {
  label: string;
  at: string | null;
  state: "done" | "failed" | "waiting";
}

export interface TransactionDetail extends Transaction {
  /** Amount minus fee; 0 for failed payments. */
  net: number;
  timeline: TimelineStep[];
}

export interface TransactionFilters {
  search: string;
  status: TransactionStatus | "all";
  method: PaymentType | "all";
  websiteId: string;
  range: TransactionRange;
  page: number;
  pageSize: number;
}

export interface TransactionSummary {
  /** Matching transactions (same as meta.total). */
  count: number;
  /** Sum of succeeded amounts among the matches. */
  collected: number;
}

export type TransactionsResponse = Paginated<Transaction, { summary: TransactionSummary; counts: { all: number } }>;

/* ───────────────────────── Revenue ───────────────────────── */

export type RevenueRange = "30d" | "90d" | "12m";

export interface RevenueFilters {
  range: RevenueRange;
  websiteId: string;
}

export interface RevenuePoint {
  key: string;
  label: string;
  tooltip?: string;
  value: number;
}

export interface RevenueSummary {
  range: RevenueRange;
  /** Succeeded payments (refunded payments are reported separately). */
  gross: number;
  fees: number;
  net: number;
  refunded: number;
  refunds: number;
  transactions: number;
  succeeded: number;
  failed: number;
  pending: number;
  /** Share of settled payments (succeeded + refunded) among settled + failed. Null when there were none. */
  successRate: number | null;
  /** Same figures for the period before; null when there was no activity then. */
  previous: { gross: number; net: number; successRate: number | null } | null;
  /** Net revenue per day (30 days), week (90 days) or month (12 months). */
  series: RevenuePoint[];
  /** Gross revenue per payment type, largest first. */
  byMethod: RevenuePoint[];
  /** False when the store has never had a transaction (for any period). */
  hasAnyTransactions: boolean;
}
