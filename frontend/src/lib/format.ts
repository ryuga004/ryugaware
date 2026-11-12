/**
 * Deterministic formatters (fixed locale + UTC) so server prerender and client render always match.
 */
const DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

export const formatDate = (iso: string | null | undefined) => (iso ? DATE.format(new Date(iso)) : "—");
export const formatDateTime = (iso: string | null | undefined) => (iso ? DATE_TIME.format(new Date(iso)) + " UTC" : "—");

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const pluralize = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const INR_PAISE = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INR_COMPACT = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });
const NUM = new Intl.NumberFormat("en-IN");

/** Rupee amount, e.g. ₹18,42,350. Pass `paise: true` to always show two decimals (fees, refunds). */
export const formatMoney = (amount: number, opts?: { paise?: boolean }) => (opts?.paise ? INR_PAISE : INR).format(amount);
/** Short rupee amount for axes and tiles, e.g. ₹18.4L. */
export const formatMoneyCompact = (amount: number) => INR_COMPACT.format(amount);
export const formatNumber = (n: number) => NUM.format(n);
export const formatPercent = (ratio: number, digits = 1) => `${(ratio * 100).toFixed(digits)}%`;

/** "3 min ago" style label relative to `nowIso` (the server clock from the response, so render stays pure). */
export function formatRelative(iso: string | null | undefined, nowIso: string) {
  if (!iso) return "—";
  const mins = Math.round((Date.parse(nowIso) - Date.parse(iso)) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(iso);
}
