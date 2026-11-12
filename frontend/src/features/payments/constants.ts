import type { StatusMap } from "@/components/platform/StatusBadge";
import type { SelectOption } from "@/components/ui/Select";
import { formatMoney } from "@/lib/format";
import type { PaymentMethod, PaymentProvider, PaymentType, RevenueRange, TransactionRange, TransactionStatus } from "./types";

export const PAYMENT_TYPES = ["card", "upi", "netbanking", "wallet", "cod"] as const satisfies readonly PaymentType[];

export const PAYMENT_TYPE: Record<PaymentType, { label: string; plural: string; mark: string; defaultName: string; defaultFee: number }> = {
  card: { label: "Card", plural: "Cards", mark: "/images/marks/payment-card.webp", defaultName: "Pay by card", defaultFee: 2 },
  upi: { label: "UPI", plural: "UPI", mark: "/images/marks/payment-upi.webp", defaultName: "UPI", defaultFee: 0 },
  netbanking: { label: "Net banking", plural: "Net banking", mark: "/images/marks/payment-netbanking.webp", defaultName: "Net banking", defaultFee: 1.9 },
  wallet: { label: "Wallet", plural: "Wallets", mark: "/images/marks/payment-wallet.webp", defaultName: "Wallet", defaultFee: 1.5 },
  cod: { label: "COD", plural: "Cash on delivery", mark: "/images/marks/payment-cod.webp", defaultName: "Cash on delivery", defaultFee: 0 },
};

export const PAYMENT_PROVIDER: Record<PaymentProvider, { label: string; keyIdLabel: string; keyIdPlaceholder: (test: boolean) => string }> = {
  razorpay: { label: "Razorpay", keyIdLabel: "API key ID", keyIdPlaceholder: (t) => (t ? "rzp_test_…" : "rzp_live_…") },
  payu: { label: "PayU", keyIdLabel: "Merchant key", keyIdPlaceholder: () => "e.g. gtKFFx" },
  cashfree: { label: "Cashfree", keyIdLabel: "App ID", keyIdPlaceholder: () => "e.g. 1234567abcdef" },
  phonepe: { label: "PhonePe", keyIdLabel: "Merchant ID", keyIdPlaceholder: () => "e.g. PGMERCHANT01" },
  paytm: { label: "Paytm", keyIdLabel: "Merchant ID", keyIdPlaceholder: () => "e.g. BLOOMS12345678" },
  offline: { label: "Collected by courier", keyIdLabel: "", keyIdPlaceholder: () => "" },
};

/** Gateways that can process each payment type (cash on delivery needs none). */
export const TYPE_PROVIDERS: Record<PaymentType, PaymentProvider[]> = {
  card: ["razorpay", "payu", "cashfree"],
  upi: ["razorpay", "payu", "cashfree", "phonepe"],
  netbanking: ["razorpay", "payu", "cashfree"],
  wallet: ["paytm", "phonepe", "razorpay"],
  cod: ["offline"],
};

export const PAYMENT_TYPE_OPTIONS: SelectOption<PaymentType | "all">[] = [
  { value: "all", label: "All types" },
  ...PAYMENT_TYPES.map((t) => ({ value: t, label: t === "cod" ? "Cash on delivery" : PAYMENT_TYPE[t].label })),
];

export const TX_METHOD_OPTIONS: SelectOption<PaymentType | "all">[] = [
  { value: "all", label: "All methods" },
  ...PAYMENT_TYPES.map((t) => ({ value: t, label: t === "cod" ? "Cash on delivery" : PAYMENT_TYPE[t].label })),
];

export type MethodMode = "live" | "test" | "offline";

export const METHOD_MODE: StatusMap<MethodMode> = {
  live: { label: "Live", tone: "success" },
  test: { label: "Test", tone: "warning" },
  offline: { label: "Offline", tone: "neutral" },
};

export const methodMode = (m: Pick<PaymentMethod, "type" | "testMode">): MethodMode => (m.type === "cod" ? "offline" : m.testMode ? "test" : "live");

/** "2% + ₹0" for gateways, "₹40 flat" for cash on delivery. */
export function formatMethodFees(m: Pick<PaymentMethod, "type" | "feePercent" | "feeFixed">) {
  if (m.type === "cod") return m.feeFixed > 0 ? `${formatMoney(m.feeFixed)} flat` : "No fee";
  return `${m.feePercent}% + ${formatMoney(m.feeFixed)}`;
}

/** "All websites", "Bloom Studio" or "2 websites". */
export function formatAvailability(m: Pick<PaymentMethod, "appliesTo" | "websiteNames">) {
  if (m.appliesTo === "all") return "All websites";
  if (m.websiteNames.length === 1) return m.websiteNames[0]!;
  return `${m.websiteNames.length} websites`;
}

export const TX_STATUS: StatusMap<TransactionStatus> = {
  succeeded: { label: "Succeeded", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
};

export const TX_STATUS_OPTIONS: SelectOption<TransactionStatus | "all">[] = [
  { value: "all", label: "All statuses" },
  { value: "succeeded", label: "Succeeded" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

export const TX_RANGE_OPTIONS: SelectOption<TransactionRange>[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export const TX_RANGE_DAYS: Record<TransactionRange, number | null> = { "7d": 7, "30d": 30, "90d": 90, all: null };

export const REVENUE_RANGE_OPTIONS: SelectOption<RevenueRange>[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
];

export const REVENUE_RANGE: Record<RevenueRange, { previousLabel: string; chartTitle: string; chartCaption: string }> = {
  "30d": { previousLabel: "previous 30 days", chartTitle: "Revenue by day", chartCaption: "Net revenue, last 30 days" },
  "90d": { previousLabel: "previous 90 days", chartTitle: "Revenue by week", chartCaption: "Net revenue, last 13 weeks" },
  "12m": { previousLabel: "previous 12 months", chartTitle: "Revenue by month", chartCaption: "Net revenue, last 12 months" },
};

export const METHOD_PAGE_SIZES = [10, 25, 50];
export const TX_PAGE_SIZES = [10, 25, 50, 100];
