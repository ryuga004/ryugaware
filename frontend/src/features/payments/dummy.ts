/**
 * Dummy backend routes for Payments.
 *   GET    /payments/methods?search&type&websiteId&page&pageSize
 *   GET    /payments/methods/:id
 *   POST   /payments/methods                    PaymentMethodInput
 *   PATCH  /payments/methods/:id                Partial<PaymentMethodInput> (e.g. { enabled })
 *   DELETE /payments/methods/:id
 *   GET    /payments/transactions?search&status&method&websiteId&range&page&pageSize
 *   GET    /payments/transactions/:id           (includes net and timeline)
 *   POST   /payments/transactions/:id/refund    succeeded -> refunded
 *   GET    /payments/revenue?range&websiteId    totals, series and breakdown computed from transactions
 *
 * Transaction dates are relative to the demo clock (DEMO_NOW) so ranges like "last 30 days" stay stable.
 */
import { badRequest, conflict, notFound } from "@/lib/api/dummy/errors";
import { db } from "@/lib/api/dummy/db";
import { code, DEMO_NOW, FIRST_NAMES, isoAgo, LAST_NAMES, rng } from "@/lib/api/dummy/fake";
import { registerRoutes } from "@/lib/api/dummy/router";
import { registerScenario } from "@/lib/api/dummy/scenario";
import { newId, nowIso, num, paginate, str } from "@/lib/api/dummy/utils";
import type { Website } from "@/features/websites/types";
import { PAYMENT_PROVIDER, PAYMENT_TYPE, PAYMENT_TYPES, TX_RANGE_DAYS, TYPE_PROVIDERS } from "./constants";
import { AMOUNT_PATTERN, MAX_FEE_PERCENT, MAX_FIXED_FEE } from "./schemas";
import type {
  PaymentMethod,
  PaymentMethodInput,
  PaymentMethodsResponse,
  PaymentType,
  RevenuePoint,
  RevenueRange,
  RevenueSummary,
  TimelineStep,
  Transaction,
  TransactionDetail,
  TransactionRange,
  TransactionsResponse,
  TransactionStatus,
} from "./types";

const METHODS = "payment-methods";
const TRANSACTIONS = "transactions";
const DAY = 86_400_000;

/** What is stored: the API shape minus derived fields, plus the credentials (never returned). */
type MethodRecord = Omit<PaymentMethod, "websiteNames" | "keyIdMasked" | "hasSecret"> & { keyId: string | null; keySecret: string | null };

const methods = () => db.collection<MethodRecord>(METHODS);
const transactions = () => db.collection<Transaction>(TRANSACTIONS);
const websites = () => db.collection<Website>("websites");

/* ───────────────────────── Demo data ───────────────────────── */

const SITE_PROFILE: Record<string, { prefix: string; min: number; max: number; weight: number }> = {
  web_01J8A1: { prefix: "BS", min: 1200, max: 12000, weight: 5 },
  web_01J8A3: { prefix: "AO", min: 1500, max: 15000, weight: 2 },
  web_01J8A4: { prefix: "FB", min: 200, max: 2500, weight: 6 },
  web_01J8A5: { prefix: "LY", min: 500, max: 6000, weight: 2 },
  web_01J8A6: { prefix: "KH", min: 2000, max: 25000, weight: 3 },
  web_01J8A7: { prefix: "DM", min: 500, max: 1500, weight: 1 },
  web_01J8A8: { prefix: "SR", min: 300, max: 3000, weight: 3 },
};
const SITE_NAMES: Record<string, string> = {
  web_01J8A1: "Bloom Studio",
  web_01J8A3: "Atlas Outdoor",
  web_01J8A4: "Fresh Basket",
  web_01J8A5: "Lotus Yoga Studio",
  web_01J8A6: "Kala Handloom",
  web_01J8A7: "Dr. Mehta Clinic",
  web_01J8A8: "Spice Route Pantry",
};
const TX_FEE: Record<PaymentType, number> = { card: 2, upi: 0, netbanking: 1.9, wallet: 1.5, cod: 0 };
const TX_PROVIDER: Record<PaymentType, string> = { card: "Razorpay", upi: "Razorpay", netbanking: "PayU", wallet: "Paytm", cod: "Courier" };
const FAILURE: Record<PaymentType, string> = {
  card: "Declined by the issuing bank.",
  upi: "The UPI request expired before the customer approved it.",
  netbanking: "The customer cancelled on the bank’s page.",
  wallet: "Not enough balance in the wallet.",
  cod: "The customer refused the delivery.",
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

/** Deterministic transactions spread over `maxDays`, busier recently. Same algorithm as the normal seed. */
function generateTransactions(seed: number, count: number, maxDays: number): Transaction[] {
  const r = rng(seed);
  const ids = new Set<string>();
  const sites = Object.entries(SITE_PROFILE).map(([id, p]) => [id, p.weight] as const);
  const rows: (Transaction & { prefix: string })[] = [];
  while (rows.length < count) {
    const days = r.int(0, maxDays - 1);
    if (!r.chance((1 + 2 * (1 - days / maxDays)) / 3)) continue;
    const minutesAgo = Math.max(5, days * 1440 + r.int(0, 1439));
    const websiteId = r.weighted(sites);
    const site = SITE_PROFILE[websiteId]!;
    const type = r.weighted<PaymentType>([["card", 45], ["upi", 35], ["netbanking", 8], ["wallet", 4], ["cod", 8]]);
    const methodLabel =
      type === "card"
        ? `${r.weighted([["Visa", 5], ["Mastercard", 4], ["RuPay", 2], ["Amex", 1]])} •••• ${r.int(1000, 9999)}`
        : type === "netbanking"
          ? `Net banking · ${r.pick(["HDFC", "ICICI", "SBI", "Axis", "Kotak", "Yes Bank"])}`
          : type === "wallet"
            ? "Paytm Wallet"
            : type === "cod"
              ? "Cash on delivery"
              : "UPI";
    const amount = r.chance(0.2) ? r.int(site.min / 100, site.max / 100) * 100 : r.int(site.min / 10, site.max / 10) * 10 - 1;
    let status: TransactionStatus;
    if (type === "cod" && minutesAgo < 5 * 1440) status = r.chance(0.85) ? "pending" : "succeeded";
    else if (minutesAgo < 60 && r.chance(0.3)) status = "pending";
    else status = r.weighted<TransactionStatus>([["succeeded", 92], ["failed", 4], ["refunded", 2]]);
    const first = r.pick(FIRST_NAMES);
    const last = r.pick(LAST_NAMES);
    let id: string;
    do id = `pay_${r.int(0, 9)}${code(r, 5)}`;
    while (ids.has(id));
    ids.add(id);
    rows.push({
      id,
      orderId: "",
      prefix: site.prefix,
      websiteId,
      websiteName: SITE_NAMES[websiteId]!,
      customerName: `${first} ${last}`,
      customerEmail: `${first}.${last}@${r.pick(["gmail.com", "gmail.com", "yahoo.in", "outlook.com"])}`.toLowerCase(),
      methodType: type,
      methodLabel,
      providerLabel: TX_PROVIDER[type],
      amount,
      fee: status === "failed" ? 0 : type === "cod" ? 40 : round2((amount * TX_FEE[type]) / 100),
      status,
      failureReason: status === "failed" ? FAILURE[type] : null,
      createdAt: isoAgo(minutesAgo),
      refundedAt: status === "refunded" ? isoAgo(Math.max(0, minutesAgo - r.int(60, 4 * 1440))) : null,
    });
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const next: Record<string, number> = {};
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i]!;
    next[row.prefix] = (next[row.prefix] ?? 1000 + (row.prefix.charCodeAt(0) % 7) * 100) + 1;
    row.orderId = `${row.prefix}-${String(next[row.prefix]).padStart(4, "0")}`;
  }
  for (const row of rows) delete (row as Partial<typeof row>).prefix;
  return rows;
}

/* Large: ~6,000 transactions over two years (a few hundred in the last 30 days). */
registerScenario<Transaction[]>(TRANSACTIONS, {
  large: (seed) => [...seed.slice(0, 10), ...generateTransactions(31, 6000, 730)],
});

/* Large: ~160 payment methods spread over the seed websites. */
registerScenario<MethodRecord[]>(METHODS, {
  large: (seed) => {
    const r = rng(17);
    const out = [...seed];
    const names = new Set(seed.map((m) => m.displayName.toLowerCase()));
    const siteIds = Object.keys(SITE_NAMES);
    for (let i = 0; i < 155; i++) {
      const type = r.weighted<PaymentType>([["card", 3], ["upi", 3], ["netbanking", 2], ["wallet", 2], ["cod", 1]]);
      const provider = r.pick(TYPE_PROVIDERS[type]);
      const websiteId = r.pick(siteIds);
      let name = type === "cod" ? `Cash on delivery – ${SITE_NAMES[websiteId]}` : `${PAYMENT_PROVIDER[provider].label} · ${PAYMENT_TYPE[type].plural} – ${SITE_NAMES[websiteId]}`;
      for (let n = 2; names.has(name.toLowerCase()); n++) name = name.replace(/ \(\d+\)$/, "") + ` (${n})`;
      names.add(name.toLowerCase());
      const testMode = type !== "cod" && r.chance(0.2);
      const createdAt = isoAgo(r.int(60, 60 * 24 * 600));
      out.push({
        id: `pm_L${code(r, 5)}${i}`,
        type,
        provider,
        displayName: name,
        enabled: r.chance(0.7),
        testMode,
        feePercent: type === "cod" ? 0 : PAYMENT_TYPE[type].defaultFee,
        feeFixed: type === "cod" ? r.pick([0, 25, 40, 50]) : 0,
        minOrder: type === "cod" ? r.pick([null, 199, 299]) : null,
        maxOrder: type === "cod" ? r.pick([null, 5000, 10000]) : null,
        appliesTo: "selected",
        websiteIds: [websiteId],
        keyId: type === "cod" ? null : provider === "razorpay" ? `rzp_${testMode ? "test" : "live"}_${code(r, 12)}` : code(r, 10),
        keySecret: type === "cod" ? null : code(r, 20),
        createdAt,
        updatedAt: createdAt,
      });
    }
    return out;
  },
});

/* ───────────────────────── Payment methods ───────────────────────── */

function maskKey(key: string | null) {
  if (!key) return null;
  const cut = key.lastIndexOf("_") + 1;
  const head = cut > 0 ? key.slice(0, cut) : key.slice(0, 2);
  return `${head}••••${key.slice(-4)}`;
}

async function toApi(m: MethodRecord): Promise<PaymentMethod> {
  const sites = await websites();
  const { keyId, keySecret, ...rest } = m;
  return {
    ...rest,
    websiteNames: m.websiteIds.map((id) => sites.find((w) => w.id === id)?.name).filter((n): n is string => Boolean(n)),
    keyIdMasked: maskKey(keyId),
    hasSecret: Boolean(keySecret),
  };
}

async function findMethod(id: string) {
  const m = (await methods()).find((x) => x.id === id);
  if (!m) throw notFound("Payment method");
  return m;
}

const isAmount = (v: unknown, max?: number) => typeof v === "number" && Number.isFinite(v) && v >= 0 && AMOUNT_PATTERN.test(String(v)) && (max === undefined || v <= max);

/** Validates a create (no `existing`) or a merged update, throwing field errors like a real API would. */
async function validate(input: PaymentMethodInput, existing?: MethodRecord) {
  const fieldErrors: Record<string, string> = {};
  const all = await methods();
  const name = (input.displayName ?? "").trim();
  if (!name) fieldErrors.displayName = "Enter a name customers will see at checkout.";
  else if (name.length > 60) fieldErrors.displayName = "Keep it under 60 characters.";

  if (input.type === "cod") {
    if (!isAmount(input.feeFixed, MAX_FIXED_FEE)) fieldErrors.feeFixed = `Enter a fee between ₹0 and ₹${MAX_FIXED_FEE}.`;
    if (input.minOrder !== null && !isAmount(input.minOrder)) fieldErrors.minOrder = "Enter an amount like 199.";
    if (input.maxOrder !== null && !isAmount(input.maxOrder)) fieldErrors.maxOrder = "Enter an amount like 10000.";
    else if (input.minOrder !== null && input.maxOrder !== null && input.maxOrder <= input.minOrder) fieldErrors.maxOrder = "Must be more than the minimum order.";
  } else {
    if (!TYPE_PROVIDERS[input.type].includes(input.provider)) fieldErrors.provider = `Choose a provider that supports ${PAYMENT_TYPE[input.type].label}.`;
    if (!isAmount(input.feePercent, MAX_FEE_PERCENT)) fieldErrors.feePercent = `Enter a percentage between 0 and ${MAX_FEE_PERCENT}.`;
    if (!isAmount(input.feeFixed, MAX_FIXED_FEE)) fieldErrors.feeFixed = `Enter a fee between ₹0 and ₹${MAX_FIXED_FEE}.`;
    const keyId = input.keyId?.trim() || existing?.keyId || "";
    const secret = input.keySecret?.trim() || existing?.keySecret || "";
    if (!keyId) fieldErrors.keyId = "Paste the key ID from your gateway dashboard.";
    else if (input.provider === "razorpay") {
      if (!/^rzp_(live|test)_[A-Za-z0-9]{6,}$/.test(keyId)) fieldErrors.keyId = "Razorpay key IDs start with rzp_live_ or rzp_test_.";
      else if (input.testMode && keyId.startsWith("rzp_live_")) fieldErrors.keyId = "This is a live key. Paste a test key (rzp_test_…) or switch to Live.";
      else if (!input.testMode && keyId.startsWith("rzp_test_")) fieldErrors.keyId = "This is a test key. Paste a live key (rzp_live_…) to go live.";
    }
    if (!secret) fieldErrors.keySecret = "Paste the key secret from your gateway dashboard.";
    else if (input.keySecret && input.keySecret.trim().length < 8) fieldErrors.keySecret = "That secret looks too short. Copy the whole value.";
  }

  if (input.appliesTo === "selected") {
    const sites = await websites();
    if (!input.websiteIds?.length) fieldErrors.websiteIds = "Choose at least one website.";
    else if (input.websiteIds.some((id) => !sites.some((w) => w.id === id))) fieldErrors.websiteIds = "One of the websites no longer exists.";
  }
  if (Object.keys(fieldErrors).length) throw badRequest("Please fix the highlighted fields.", fieldErrors);

  const dupe = all.find((m) => m.id !== existing?.id && m.displayName.toLowerCase() === name.toLowerCase());
  if (dupe) throw conflict("method_exists", "You already have a payment method with that name.", { displayName: `“${dupe.displayName}” already exists. Use a different name.` });
}

function applyInput(target: MethodRecord, input: PaymentMethodInput) {
  const cod = input.type === "cod";
  target.provider = cod ? "offline" : input.provider;
  target.displayName = input.displayName.trim();
  target.testMode = cod ? false : input.testMode;
  target.feePercent = cod ? 0 : input.feePercent;
  target.feeFixed = input.feeFixed;
  target.minOrder = cod ? input.minOrder : null;
  target.maxOrder = cod ? input.maxOrder : null;
  target.appliesTo = input.appliesTo;
  target.websiteIds = input.appliesTo === "all" ? [] : [...new Set(input.websiteIds)];
  target.enabled = input.enabled;
  if (cod) {
    target.keyId = null;
    target.keySecret = null;
  } else {
    if (input.keyId?.trim()) target.keyId = input.keyId.trim();
    if (input.keySecret?.trim()) target.keySecret = input.keySecret.trim();
  }
  target.updatedAt = nowIso();
}

/* ───────────────────────── Transactions ───────────────────────── */

function timeline(t: Transaction): TimelineStep[] {
  const at = (offsetSec: number) => iso(Date.parse(t.createdAt) + offsetSec * 1000);
  if (t.methodType === "cod") {
    const steps: TimelineStep[] = [{ label: "Order placed", at: t.createdAt, state: "done" }];
    if (t.status === "pending") steps.push({ label: "Cash to be collected on delivery", at: null, state: "waiting" });
    else if (t.status === "failed") steps.push({ label: t.failureReason ?? "Delivery failed", at: at(2 * 86400), state: "failed" });
    else steps.push({ label: "Delivered, cash collected by courier", at: at(2 * 86400), state: "done" });
    if (t.status === "refunded") steps.push({ label: "Refunded", at: t.refundedAt, state: "done" });
    return steps;
  }
  const steps: TimelineStep[] = [{ label: "Payment created", at: t.createdAt, state: "done" }];
  if (t.status === "failed") return [...steps, { label: t.failureReason ?? "Payment failed", at: at(90), state: "failed" }];
  if (t.status === "pending") return [...steps, { label: "Waiting for the bank to confirm", at: null, state: "waiting" }];
  steps.push({ label: "Authorized by bank", at: at(20), state: "done" }, { label: "Captured", at: at(60), state: "done" });
  if (t.status === "refunded") steps.push({ label: "Refunded", at: t.refundedAt, state: "done" });
  return steps;
}

const txDetail = (t: Transaction): TransactionDetail => ({
  ...t,
  net: t.status === "failed" ? 0 : round2(t.amount - t.fee),
  timeline: timeline(t),
});

async function findTransaction(id: string) {
  const t = (await transactions()).find((x) => x.id === id);
  if (!t) throw notFound("Transaction");
  return t;
}

/* ───────────────────────── Revenue ───────────────────────── */

const DAY_LABEL = new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: "UTC" });
const WEEK_LABEL = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const MONTH_LABEL = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });
const MONTH_YEAR_LABEL = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

/** Buckets for the chart plus the [start, end) window and the window before it. */
function revenueWindow(range: RevenueRange) {
  const today = Math.floor(DEMO_NOW / DAY) * DAY;
  const end = today + DAY;
  if (range === "12m") {
    const d = new Date(today);
    const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 11, 1);
    const prevStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 23, 1);
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const from = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 11 + i, 1);
      return { key: iso(from).slice(0, 7), label: MONTH_LABEL.format(from), tooltip: MONTH_YEAR_LABEL.format(from), from };
    });
    return { start, end, prevStart, buckets };
  }
  const size = range === "30d" ? 1 : 7;
  const count = range === "30d" ? 30 : 13;
  const start = end - size * count * DAY;
  const buckets = Array.from({ length: count }, (_, i) => {
    const from = start + i * size * DAY;
    return { key: iso(from).slice(0, 10), label: (size === 1 ? DAY_LABEL : WEEK_LABEL).format(from), tooltip: WEEK_LABEL.format(from), from };
  });
  return { start, end, prevStart: start - (end - start), buckets };
}

function totals(rows: Transaction[]) {
  let gross = 0;
  let fees = 0;
  let refunded = 0;
  const c = { succeeded: 0, failed: 0, pending: 0, refunded: 0 };
  for (const t of rows) {
    c[t.status] += 1;
    if (t.status === "succeeded") {
      gross += t.amount;
      fees += t.fee;
    } else if (t.status === "refunded") refunded += t.amount;
  }
  const settled = c.succeeded + c.refunded;
  return {
    gross: round2(gross),
    fees: round2(fees),
    net: round2(gross - fees),
    refunded: round2(refunded),
    counts: c,
    successRate: settled + c.failed > 0 ? settled / (settled + c.failed) : null,
  };
}

async function revenue(range: RevenueRange, websiteId: string): Promise<RevenueSummary> {
  const all = await transactions();
  const scoped = all.filter((t) => !websiteId || websiteId === "all" || t.websiteId === websiteId);
  const { start, end, prevStart, buckets } = revenueWindow(range);
  const inRange = scoped.filter((t) => {
    const ms = Date.parse(t.createdAt);
    return ms >= start && ms < end;
  });
  const before = scoped.filter((t) => {
    const ms = Date.parse(t.createdAt);
    return ms >= prevStart && ms < start;
  });
  const now = totals(inRange);
  const prev = totals(before);

  const series: RevenuePoint[] = buckets.map((b) => ({ key: b.key, label: b.label, tooltip: b.tooltip, value: 0 }));
  const byType = new Map<PaymentType, number>();
  for (const t of inRange) {
    if (t.status !== "succeeded") continue;
    const ms = Date.parse(t.createdAt);
    let i = buckets.length - 1;
    while (i > 0 && buckets[i]!.from > ms) i--;
    series[i]!.value = round2(series[i]!.value + t.amount - t.fee);
    byType.set(t.methodType, (byType.get(t.methodType) ?? 0) + t.amount);
  }

  return {
    range,
    gross: now.gross,
    fees: now.fees,
    net: now.net,
    refunded: now.refunded,
    refunds: now.counts.refunded,
    transactions: inRange.length,
    succeeded: now.counts.succeeded,
    failed: now.counts.failed,
    pending: now.counts.pending,
    successRate: now.successRate,
    previous: before.length ? { gross: prev.gross, net: prev.net, successRate: prev.successRate } : null,
    series,
    byMethod: PAYMENT_TYPES.filter((t) => (byType.get(t) ?? 0) > 0)
      .map((t) => ({ key: t, label: PAYMENT_TYPE[t].plural, value: round2(byType.get(t)!) }))
      .sort((a, b) => b.value - a.value),
    hasAnyTransactions: all.length > 0,
  };
}

/* ───────────────────────── Routes ───────────────────────── */

registerRoutes([
  {
    method: "GET",
    path: "/payments/methods",
    handler: async ({ query }): Promise<PaymentMethodsResponse> => {
      const all = await methods();
      const search = str(query, "search").trim().toLowerCase();
      const type = str(query, "type");
      const websiteId = str(query, "websiteId");
      const filtered = all
        .filter(
          (m) =>
            !search ||
            m.displayName.toLowerCase().includes(search) ||
            PAYMENT_PROVIDER[m.provider].label.toLowerCase().includes(search) ||
            PAYMENT_TYPE[m.type].label.toLowerCase().includes(search),
        )
        .filter((m) => !type || type === "all" || m.type === type)
        .filter((m) => !websiteId || websiteId === "all" || m.appliesTo === "all" || m.websiteIds.includes(websiteId))
        // Checkout order: the order they were added in.
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const { items, meta } = paginate(filtered, num(query, "page", 1), num(query, "pageSize", 10));
      return {
        data: await Promise.all(items.map(toApi)),
        meta: { ...meta, counts: { all: all.length, enabled: all.filter((m) => m.enabled).length } },
      };
    },
  },
  {
    method: "GET",
    path: "/payments/methods/:id",
    handler: async ({ params }) => ({ data: await toApi(await findMethod(params.id)) }),
  },
  {
    method: "POST",
    path: "/payments/methods",
    handler: async ({ body }) => {
      const input = body as PaymentMethodInput;
      if (!PAYMENT_TYPES.includes(input.type)) throw badRequest("Choose a payment type.");
      await validate(input);
      const now = nowIso();
      const created: MethodRecord = {
        id: newId("pm"),
        type: input.type,
        provider: input.provider,
        displayName: "",
        enabled: true,
        testMode: false,
        feePercent: 0,
        feeFixed: 0,
        minOrder: null,
        maxOrder: null,
        appliesTo: "all",
        websiteIds: [],
        keyId: null,
        keySecret: null,
        createdAt: now,
        updatedAt: now,
      };
      applyInput(created, input);
      (await methods()).push(created);
      return { data: await toApi(created) };
    },
  },
  {
    method: "PATCH",
    path: "/payments/methods/:id",
    handler: async ({ params, body }) => {
      const m = await findMethod(params.id);
      const patch = body as Partial<PaymentMethodInput>;
      if (patch.type && patch.type !== m.type) throw badRequest("The payment type can’t be changed. Add a new method instead.");
      const merged: PaymentMethodInput = {
        type: m.type,
        provider: patch.provider ?? m.provider,
        displayName: patch.displayName ?? m.displayName,
        testMode: patch.testMode ?? m.testMode,
        feePercent: patch.feePercent ?? m.feePercent,
        feeFixed: patch.feeFixed ?? m.feeFixed,
        minOrder: patch.minOrder !== undefined ? patch.minOrder : m.minOrder,
        maxOrder: patch.maxOrder !== undefined ? patch.maxOrder : m.maxOrder,
        keyId: patch.keyId,
        keySecret: patch.keySecret,
        appliesTo: patch.appliesTo ?? m.appliesTo,
        websiteIds: patch.websiteIds ?? m.websiteIds,
        enabled: patch.enabled ?? m.enabled,
      };
      // A provider change needs fresh credentials: the old key belongs to the old gateway.
      if (merged.provider !== m.provider && m.type !== "cod" && (!patch.keyId || !patch.keySecret)) {
        throw badRequest("Please fix the highlighted fields.", {
          ...(!patch.keyId && { keyId: `Paste the key ID from your ${PAYMENT_PROVIDER[merged.provider].label} dashboard.` }),
          ...(!patch.keySecret && { keySecret: `Paste the key secret from your ${PAYMENT_PROVIDER[merged.provider].label} dashboard.` }),
        });
      }
      await validate(merged, m);
      applyInput(m, merged);
      return { data: await toApi(m) };
    },
  },
  {
    method: "DELETE",
    path: "/payments/methods/:id",
    handler: async ({ params }) => {
      const all = await methods();
      const i = all.findIndex((x) => x.id === params.id);
      if (i < 0) throw notFound("Payment method");
      const [removed] = all.splice(i, 1);
      return { data: { id: removed!.id, displayName: removed!.displayName } };
    },
  },
  {
    method: "GET",
    path: "/payments/transactions",
    handler: async ({ query }): Promise<TransactionsResponse> => {
      const all = await transactions();
      const search = str(query, "search").trim().toLowerCase();
      const status = str(query, "status");
      const method = str(query, "method");
      const websiteId = str(query, "websiteId");
      const days = TX_RANGE_DAYS[(str(query, "range") || "all") as TransactionRange] ?? null;
      const since = days === null ? null : DEMO_NOW - days * DAY;
      const filtered = all
        .filter(
          (t) =>
            !search ||
            t.id.toLowerCase().includes(search) ||
            t.orderId.toLowerCase().includes(search) ||
            t.customerName.toLowerCase().includes(search) ||
            t.customerEmail.includes(search),
        )
        .filter((t) => !status || status === "all" || t.status === status)
        .filter((t) => !method || method === "all" || t.methodType === method)
        .filter((t) => !websiteId || websiteId === "all" || t.websiteId === websiteId)
        .filter((t) => since === null || Date.parse(t.createdAt) >= since)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const collected = round2(filtered.reduce((n, t) => (t.status === "succeeded" ? n + t.amount : n), 0));
      const { items, meta } = paginate(filtered, num(query, "page", 1), num(query, "pageSize", 10));
      return { data: items, meta: { ...meta, summary: { count: filtered.length, collected }, counts: { all: all.length } } };
    },
  },
  {
    method: "GET",
    path: "/payments/transactions/:id",
    handler: async ({ params }) => ({ data: txDetail(await findTransaction(params.id)) }),
  },
  {
    method: "POST",
    path: "/payments/transactions/:id/refund",
    handler: async ({ params }) => {
      const t = await findTransaction(params.id);
      if (t.status === "refunded") throw conflict("already_refunded", "This payment has already been refunded.");
      if (t.status !== "succeeded") throw badRequest("Only successful payments can be refunded.");
      t.status = "refunded";
      t.refundedAt = nowIso();
      return { data: txDetail(t) };
    },
  },
  {
    method: "GET",
    path: "/payments/revenue",
    handler: async ({ query }) => {
      const r = str(query, "range");
      const range: RevenueRange = r === "90d" || r === "12m" ? r : "30d";
      return { data: await revenue(range, str(query, "websiteId")) };
    },
  },
]);
