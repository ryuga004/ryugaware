/**
 * Dummy backend routes for Users (the shoppers who sign up on the merchant's websites).
 *   GET    /customers?search&websiteId&status&signIn&sort&dir&page&pageSize
 *   GET    /customers/export?<same filters>   -> { filename, csv, rows }
 *   GET    /customers/:id                     (addresses + recent orders)
 *   PATCH  /customers/:id                     { status: "active" | "blocked" }
 *   DELETE /customers/:id
 */
import { badRequest, notFound } from "@/lib/api/dummy/errors";
import { db } from "@/lib/api/dummy/db";
import { CITIES, DEMO_NOW, FIRST_NAMES, LAST_NAMES, code, isoAgo, rng } from "@/lib/api/dummy/fake";
import { registerRoutes } from "@/lib/api/dummy/router";
import { registerScenario } from "@/lib/api/dummy/scenario";
import { num, paginate, str } from "@/lib/api/dummy/utils";
import type { QueryParams } from "@/lib/api/types";
import type {
  Customer,
  CustomerAddress,
  CustomerCounts,
  CustomerDetail,
  CustomerExport,
  CustomerOrder,
  CustomerOrderStatus,
  CustomersResponse,
  CustomerStatus,
  SignInMethod,
} from "./types";

/** Seed rows may carry saved addresses; the rest get generated ones on first read. */
type CustomerRecord = Customer & { addresses?: CustomerAddress[] };

const FILE = "customers";
const customers = () => db.collection<CustomerRecord>(FILE);

const SITES: [string, string][] = [
  ["web_01J8A1", "Bloom Studio"],
  ["web_01J8A2", "Northwind Coffee"],
  ["web_01J8A3", "Atlas Outdoor"],
  ["web_01J8A4", "Fresh Basket"],
  ["web_01J8A5", "Lotus Yoga Studio"],
  ["web_01J8A6", "Kala Handloom"],
  ["web_01J8A7", "Dr. Mehta Clinic"],
  ["web_01J8A8", "Spice Route Pantry"],
];
const MAIL = ["gmail.com", "gmail.com", "gmail.com", "outlook.com", "yahoo.com", "hotmail.com", "icloud.com", "proton.me"];
const STREETS = ["MG Road", "Linking Road", "Park Street", "Lake View Road", "Gandhi Nagar", "Sector 4", "Civil Lines", "Nehru Colony", "Church Street", "Ring Road"];

/* Large: ~2,400 customers spread over the seed websites and the last 18 months. */
registerScenario<CustomerRecord[]>(FILE, {
  large: (seed) => {
    const r = rng(97);
    const out = [...seed];
    for (let i = 0; i < 2400 - seed.length; i++) {
      const first = r.pick(FIRST_NAMES);
      const last = r.pick(LAST_NAMES);
      const [websiteId, websiteName] = r.pick(SITES);
      const signInMethod = r.weighted<SignInMethod>([["google", 6], ["email", 4]]);
      const joinedMin = r.int(30, 60 * 24 * 540);
      const verified = signInMethod === "google" || r.chance(0.85);
      const status: CustomerStatus = !verified ? "unverified" : r.chance(0.03) ? "blocked" : "active";
      const orders = status === "unverified" ? 0 : r.weighted([[0, 3], [1, 4], [r.int(2, 5), 5], [r.int(6, 15), 2], [r.int(16, 40), 1]]);
      const lastActiveMin = r.chance(0.04) ? null : r.int(5, joinedMin);
      out.push({
        id: `cus_L${code(r, 5)}${i}`,
        name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${r.chance(0.5) ? r.int(1, 99) : ""}@${r.pick(MAIL)}`,
        phone: r.chance(0.7) ? `+91 9${r.int(1000, 9999)} ${r.int(10000, 99999)}` : null,
        avatar: r.chance(0.25) ? `a${r.int(1, 12)}` : null,
        websiteId,
        websiteName,
        signInMethod,
        status,
        verified,
        orders,
        totalSpent: orders === 0 ? 0 : orders * r.int(30, 900) * 10,
        joinedAt: isoAgo(joinedMin),
        lastActiveAt: lastActiveMin === null ? null : isoAgo(lastActiveMin),
      });
    }
    return out;
  },
});

/* ───────────── Helpers ───────────── */

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const orderPrefix = (website: string) =>
  website
    .replace(/[^A-Za-z ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

function addressesFor(c: CustomerRecord): CustomerAddress[] {
  if (c.addresses) return c.addresses;
  if (c.orders === 0) return [];
  const r = rng(hash(c.id));
  const [city, state] = r.pick(CITIES);
  return [{ id: `adr_${c.id}`, label: "Home", line: `${r.int(1, 240)}, ${r.pick(STREETS)}`, city, state, pincode: String(r.int(110001, 799999)), isDefault: true }];
}

/** Up to five most recent orders, consistent with the customer's order count and total spend. */
function recentOrdersFor(c: CustomerRecord): CustomerOrder[] {
  if (c.orders === 0) return [];
  const r = rng(hash(c.id) ^ 0x9e37);
  const avg = c.totalSpent / c.orders;
  const latest = Date.parse(c.lastActiveAt ?? c.joinedAt);
  const earliest = Date.parse(c.joinedAt);
  const n = Math.min(5, c.orders);
  const out: CustomerOrder[] = [];
  let t = latest;
  for (let i = 0; i < n; i++) {
    const ageDays = (DEMO_NOW - t) / 86_400_000;
    const status: CustomerOrderStatus =
      i === 0 && ageDays < 1 ? "processing" : i === 0 && ageDays < 4 ? "shipped" : r.chance(0.06) ? "cancelled" : "delivered";
    out.push({
      id: `${orderPrefix(c.websiteName)}-${String(hash(c.id + i) % 9000 + 1000)}`,
      placedAt: new Date(t).toISOString(),
      total: Math.max(99, Math.round((avg * (0.6 + r.next() * 0.8)) / 10) * 10 - 1),
      items: r.int(1, 5),
      status,
    });
    t = Math.max(earliest, t - r.int(3, 40) * 86_400_000);
  }
  return out;
}

/** List rows never include addresses (the stored record may). */
const toCustomer = (c: CustomerRecord): Customer => {
  const base: CustomerRecord = { ...c };
  delete base.addresses;
  return base;
};

const detail = (c: CustomerRecord): CustomerDetail => ({
  ...toCustomer(c),
  addresses: addressesFor(c),
  recentOrders: recentOrdersFor(c),
  averageOrder: c.orders ? Math.round(c.totalSpent / c.orders) : 0,
});

function counts(items: CustomerRecord[]): CustomerCounts {
  const since = new Date(DEMO_NOW - 30 * 86_400_000).toISOString();
  const c: CustomerCounts = { all: items.length, active: 0, blocked: 0, unverified: 0, newLast30Days: 0 };
  for (const x of items) {
    c[x.status] += 1;
    if (x.joinedAt >= since) c.newLast30Days += 1;
  }
  return c;
}

/** Filters + sort shared by the list and the CSV export. */
async function query(q: QueryParams) {
  const all = await customers();
  const search = str(q, "search").trim().toLowerCase();
  const websiteId = str(q, "websiteId");
  const status = str(q, "status");
  const signIn = str(q, "signIn");
  const sort = str(q, "sort") || "joined";
  const dir = str(q, "dir") === "asc" ? 1 : -1;
  const value = (c: CustomerRecord): number | string =>
    sort === "spent" ? c.totalSpent : sort === "lastActive" ? (c.lastActiveAt ?? "") : c.joinedAt;
  const filtered = all
    .filter((c) => !search || c.name.toLowerCase().includes(search) || c.email.includes(search) || (c.phone ?? "").replace(/\s+/g, "").includes(search.replace(/\s+/g, "")))
    .filter((c) => !websiteId || websiteId === "all" || c.websiteId === websiteId)
    .filter((c) => !status || status === "all" || c.status === status)
    .filter((c) => !signIn || signIn === "all" || c.signInMethod === signIn)
    .sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      // Never-active customers always sort last.
      if (va === "" || vb === "") return va === vb ? 0 : va === "" ? 1 : -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir || a.name.localeCompare(b.name);
    });
  return { all, filtered };
}

async function find(id: string) {
  const c = (await customers()).find((x) => x.id === id);
  if (!c) throw notFound("User");
  return c;
}

function csvCell(v: string | number | null) {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* ───────────── Routes ───────────── */

registerRoutes([
  {
    method: "GET",
    path: "/customers",
    handler: async ({ query: q }): Promise<CustomersResponse> => {
      const { all, filtered } = await query(q);
      const { items, meta } = paginate(filtered, num(q, "page", 1), num(q, "pageSize", 10));
      return { data: items.map(toCustomer), meta: { ...meta, counts: counts(all) } };
    },
  },
  {
    method: "GET",
    path: "/customers/export",
    handler: async ({ query: q }): Promise<{ data: CustomerExport }> => {
      const { filtered } = await query(q);
      const header = ["Name", "Email", "Phone", "Website", "Sign-in method", "Status", "Orders", "Total spent (INR)", "Joined", "Last active"];
      const lines = filtered.map((c) =>
        [c.name, c.email, c.phone, c.websiteName, c.signInMethod, c.status, c.orders, c.totalSpent, c.joinedAt.slice(0, 10), c.lastActiveAt?.slice(0, 10) ?? null].map(csvCell).join(","),
      );
      return { data: { filename: `users-${new Date(DEMO_NOW).toISOString().slice(0, 10)}.csv`, csv: [header.join(","), ...lines].join("\n"), rows: lines.length } };
    },
  },
  {
    method: "GET",
    path: "/customers/:id",
    handler: async ({ params }) => ({ data: detail(await find(params.id)) }),
  },
  {
    method: "PATCH",
    path: "/customers/:id",
    handler: async ({ params, body }) => {
      const c = await find(params.id);
      const { status } = (body ?? {}) as { status?: string };
      if (status === "blocked") c.status = "blocked";
      else if (status === "active") {
        if (c.status !== "blocked") throw badRequest("Only blocked users can be unblocked.");
        // An unblocked user who never confirmed their email goes back to unverified.
        c.status = c.verified ? "active" : "unverified";
      } else throw badRequest("Unknown status.");
      return { data: detail(c) };
    },
  },
  {
    method: "DELETE",
    path: "/customers/:id",
    handler: async ({ params }) => {
      const all = await customers();
      const i = all.findIndex((x) => x.id === params.id);
      if (i < 0) throw notFound("User");
      const [removed] = all.splice(i, 1);
      return { data: { id: removed!.id, name: removed!.name } };
    },
  },
]);
