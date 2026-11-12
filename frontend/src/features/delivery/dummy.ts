/**
 * Dummy backend routes for Delivery.
 *   GET    /delivery/methods?search&websiteId&status&page&pageSize
 *   POST   /delivery/methods/presets      adds the four recommended methods (empty-state shortcut)
 *   GET    /delivery/methods/:id
 *   POST   /delivery/methods              DeliveryMethodInput
 *   PATCH  /delivery/methods/:id          Partial<DeliveryMethodInput> (e.g. { enabled })
 *   DELETE /delivery/methods/:id          409 when it is the last enabled method
 *
 *   GET    /shipments?search&status&methodType&websiteId&page&pageSize
 *   GET    /shipments/:id                 (includes the event timeline)
 *   POST   /shipments/:id/status          { action: "ship" | "deliver" | "retry" | "return" }
 */
import { badRequest, conflict, notFound } from "@/lib/api/dummy/errors";
import { db } from "@/lib/api/dummy/db";
import { CITIES, FIRST_NAMES, LAST_NAMES, code, isoAgo, rng } from "@/lib/api/dummy/fake";
import { registerRoutes } from "@/lib/api/dummy/router";
import { registerScenario } from "@/lib/api/dummy/scenario";
import { newId, nowIso, num, paginate, str } from "@/lib/api/dummy/utils";
import type { Website } from "@/features/websites/types";
import { CARRIERS, DELIVERY_TYPE_DEFAULTS, SHIPMENT_TRANSITIONS, STATES, actionResult, isShipmentAction } from "./constants";
import { PIN_PREFIX } from "./schemas";
import type {
  DeliveryMethod,
  DeliveryMethodCounts,
  DeliveryMethodInput,
  DeliveryMethodsResponse,
  DeliveryType,
  Shipment,
  ShipmentCounts,
  ShipmentDetail,
  ShipmentEvent,
  ShipmentEventCode,
  ShipmentsResponse,
  ShipmentStatus,
} from "./types";

type MethodRecord = Omit<DeliveryMethod, "websiteNames">;
/** Stored shipment: the timeline is built lazily from the timestamps the first time it is needed. */
type ShipmentRecord = Omit<Shipment, "trackingUrl"> & { events?: ShipmentEvent[] };

const METHODS_FILE = "delivery-methods";
const SHIPMENTS_FILE = "shipments";
const methods = () => db.collection<MethodRecord>(METHODS_FILE);
const shipments = () => db.collection<ShipmentRecord>(SHIPMENTS_FILE);
const websites = () => db.collection<Website>("websites");

/** Where each seed website ships from (packing + return location on the timeline). */
const ORIGIN: Record<string, string> = {
  web_01J8A1: "Mumbai",
  web_01J8A2: "Bengaluru",
  web_01J8A3: "Bengaluru",
  web_01J8A4: "Pune",
  web_01J8A5: "Hyderabad",
  web_01J8A6: "Jaipur",
  web_01J8A7: "Delhi",
  web_01J8A8: "Kochi",
};
const SITE_NAMES: [string, string][] = [
  ["web_01J8A1", "Bloom Studio"],
  ["web_01J8A2", "Northwind Coffee"],
  ["web_01J8A3", "Atlas Outdoor"],
  ["web_01J8A4", "Fresh Basket"],
  ["web_01J8A5", "Lotus Yoga Studio"],
  ["web_01J8A6", "Kala Handloom"],
  ["web_01J8A7", "Dr. Mehta Clinic"],
  ["web_01J8A8", "Spice Route Pantry"],
];
const orderPrefix = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/* ───────────── Scenarios ───────────── */

/* Large: per-website variants of every method type (~48 rows). */
registerScenario<MethodRecord[]>(METHODS_FILE, {
  large: (seed) => {
    const r = rng(31);
    const out = [...seed];
    const types: DeliveryType[] = ["standard", "express", "same_day", "pickup"];
    let i = 0;
    for (const [websiteId, websiteName] of SITE_NAMES) {
      for (let k = 0; k < 6; k++) {
        const type = r.pick(types);
        const d = DELIVERY_TYPE_DEFAULTS[type];
        const rateType = type === "pickup" ? "free" : r.weighted([["flat", 3], ["free_above", 2], ["free", 1]] as const);
        const price = rateType === "free" ? 0 : r.int(4, 20) * 10 - 1;
        const coverage = type === "same_day" ? "metro" : type === "pickup" ? "pincodes" : r.weighted([["all_india", 4], ["states", 2], ["pincodes", 1]] as const);
        out.push({
          id: `dlm_L${code(r, 5)}${i++}`,
          name: `${d.name} · ${websiteName.split(" ")[0]} ${k + 1}`,
          type,
          carrier: type === "pickup" ? "Self" : type === "same_day" ? "Local partner" : r.pick(CARRIERS.slice(0, 7)),
          minDays: d.minDays,
          maxDays: d.maxDays,
          rateType,
          price,
          freeAbove: rateType === "free_above" ? r.int(5, 20) * 100 - 1 : null,
          coverage,
          regions:
            coverage === "states"
              ? [r.pick(STATES), r.pick(STATES)].filter((s, j, a) => a.indexOf(s) === j)
              : coverage === "pincodes"
                ? [String(r.int(110, 800)), String(r.int(110, 800))]
                : [],
          websiteIds: [websiteId],
          enabled: r.chance(0.7),
          createdAt: isoAgo(r.int(60 * 24 * 20, 60 * 24 * 240)),
          updatedAt: isoAgo(r.int(60, 60 * 24 * 20)),
        });
      }
    }
    return out;
  },
});

/* Large: 412 shipments over the last ~45 days. */
registerScenario<ShipmentRecord[]>(SHIPMENTS_FILE, {
  large: (seed) => {
    const r = rng(53);
    const out = [...seed];
    const streets = ["MG Road", "Station Road", "Park Street", "Lake View", "Gandhi Nagar", "Sector 4", "Civil Lines", "Nehru Colony"];
    for (let i = 0; i < 412 - seed.length; i++) {
      const [websiteId, websiteName] = r.pick(SITE_NAMES.filter(([id]) => id !== "web_01J8A7"));
      const methodType = r.weighted<DeliveryType>([["standard", 6], ["express", 3], ["same_day", 2], ["pickup", 1]]);
      const ageMin = r.int(30, 60 * 24 * 45);
      // Older shipments have mostly finished; recent ones are still moving.
      const status: ShipmentStatus =
        ageMin < 60 * 6
          ? r.weighted([["processing", 3], ["in_transit", 1]])
          : ageMin < 60 * 24 * 4
            ? r.weighted([["in_transit", 4], ["out_for_delivery", 2], ["delivered", 3], ["failed", 1]])
            : r.weighted([["delivered", 14], ["failed", 1], ["returned", 1]]);
      const span = status === "processing" ? r.int(5, Math.max(6, ageMin - 5)) : Math.min(ageMin - 5, methodType === "same_day" || methodType === "pickup" ? r.int(240, 600) : r.int(60 * 24, 60 * 24 * 5));
      const createdAt = isoAgo(ageMin);
      const updatedAt = isoAgo(Math.max(0, ageMin - Math.max(5, span)));
      const first = r.pick(FIRST_NAMES);
      const last = r.pick(LAST_NAMES);
      const [city, state] = r.pick(CITIES);
      const carrier = methodType === "pickup" ? "Self" : methodType === "same_day" ? "Local partner" : methodType === "express" ? r.pick(["Blue Dart", "DTDC"]) : r.pick(["Delhivery", "Ecom Express", "XpressBees"]);
      const shipped = status !== "processing";
      out.push({
        id: `SH-${47800 - i}`,
        orderId: `${orderPrefix(websiteName)}-${String(7000 - i).padStart(4, "0")}`,
        websiteId,
        websiteName,
        customerName: `${first} ${last}`,
        destination: { name: `${first} ${last}`, line: `${r.int(1, 220)}, ${r.pick(streets)}`, city, state, pincode: String(r.int(110001, 799999)) },
        methodName: `${methodType === "same_day" ? "Same-day" : methodType === "pickup" ? "Store" : methodType === "express" ? "Express" : "Standard"} ${methodType === "pickup" ? "pickup" : "delivery"}`,
        methodType,
        carrier,
        awb: !shipped || methodType === "pickup" ? null : carrier === "Local partner" ? `LC-${r.int(200000, 299999)}` : `${code(r, 2)} ${r.int(1000, 9999)} ${r.int(1000, 9999)}`,
        status,
        itemCount: r.int(1, 6),
        orderTotal: r.int(3, 400) * 10 - 1,
        failureReason: status === "failed" || status === "returned" ? r.pick(["Customer not reachable.", "Address incomplete.", "Customer refused the delivery.", "Area not serviceable today."]) : null,
        eta: ["processing", "in_transit", "out_for_delivery"].includes(status) ? isoAgo(-r.int(60 * 4, 60 * 24 * 4)) : null,
        createdAt,
        updatedAt,
      });
    }
    return out;
  },
});

/* ───────────── Delivery methods ───────────── */

async function withNames(m: MethodRecord): Promise<DeliveryMethod> {
  const sites = await websites();
  const websiteNames = m.websiteIds.map((id) => sites.find((w) => w.id === id)?.name).filter((n): n is string => Boolean(n));
  return { ...m, websiteNames };
}

function methodCounts(items: MethodRecord[]): DeliveryMethodCounts {
  const enabled = items.filter((m) => m.enabled).length;
  return { all: items.length, enabled, disabled: items.length - enabled };
}

async function findMethod(id: string) {
  const m = (await methods()).find((x) => x.id === id);
  if (!m) throw notFound("Delivery method");
  return m;
}

/** Server-side validation mirroring the form schema. Field errors use the form's field names. */
async function validateMethod(input: Partial<DeliveryMethodInput>, existing?: MethodRecord): Promise<Omit<MethodRecord, "id" | "createdAt" | "updatedAt">> {
  const v = { ...existing, ...input } as DeliveryMethodInput;
  const fe: Record<string, string> = {};
  const name = String(v.name ?? "").trim();
  if (!name) fe.name = "Enter a name customers will see.";
  else if (name.length > 40) fe.name = "Use 40 characters or fewer.";
  else {
    const dup = (await methods()).find((m) => m.id !== existing?.id && m.name.toLowerCase() === name.toLowerCase());
    if (dup) fe.name = "You already have a method with this name.";
  }
  if (!["standard", "express", "same_day", "pickup"].includes(v.type)) fe.type = "Choose a type.";
  if (!v.carrier) fe.carrier = "Choose a carrier.";
  const minOk = Number.isInteger(v.minDays) && v.minDays >= 0 && v.minDays <= 30;
  const maxOk = Number.isInteger(v.maxDays) && v.maxDays >= 0 && v.maxDays <= 30;
  if (!minOk) fe.minDays = "Enter 0 to 30 days.";
  if (!maxOk) fe.maxDays = "Enter 0 to 30 days.";
  else if (minOk && v.maxDays < v.minDays) fe.maxDays = "Must be at least the minimum.";
  if (v.rateType !== "free" && !(v.price >= 1 && v.price <= 5000)) fe.price = "Enter a fee between ₹1 and ₹5,000.";
  if (v.rateType === "free_above" && !(Number(v.freeAbove) > v.price)) fe.freeAbove = "Must be more than the fee.";
  const regions = Array.isArray(v.regions) ? v.regions : [];
  if (v.coverage === "states" && (regions.length === 0 || regions.some((s) => !(STATES as readonly string[]).includes(s)))) fe.states = "Choose at least one state.";
  if (v.coverage === "pincodes" && (regions.length === 0 || regions.some((p) => !PIN_PREFIX.test(p)))) fe.pincodes = "Use 2–6 digit PIN codes or prefixes.";
  const sites = await websites();
  const websiteIds = Array.isArray(v.websiteIds) ? v.websiteIds : [];
  if (websiteIds.some((id) => !sites.some((w) => w.id === id))) fe.websiteIds = "Choose websites from your account.";
  if (Object.keys(fe).length) throw badRequest("Please fix the highlighted fields.", fe);
  return {
    name,
    type: v.type,
    carrier: v.carrier,
    minDays: v.minDays,
    maxDays: v.maxDays,
    rateType: v.rateType,
    price: v.rateType === "free" ? 0 : v.price,
    freeAbove: v.rateType === "free_above" ? Number(v.freeAbove) : null,
    coverage: v.coverage,
    regions: v.coverage === "states" || v.coverage === "pincodes" ? regions : [],
    websiteIds,
    enabled: v.enabled ?? true,
  };
}

const lastEnabledError = () =>
  conflict("last_enabled_method", "Customers need at least one way to receive orders. Enable another delivery method first.");

/* ───────────── Shipments ───────────── */

const TRACKING: Record<string, (awb: string) => string> = {
  Delhivery: (a) => `https://www.delhivery.com/track/package/${a}`,
  "Blue Dart": (a) => `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${a}`,
  DTDC: (a) => `https://www.dtdc.in/tracking.asp?strCnno=${a}`,
  "Ecom Express": (a) => `https://ecomexpress.in/tracking/?awb_field=${a}`,
  XpressBees: (a) => `https://www.xpressbees.com/shipment/tracking?awbNo=${a}`,
};

function toShipment(s: ShipmentRecord): Shipment {
  const rest: Omit<ShipmentRecord, "events"> & { events?: unknown } = { ...s };
  delete rest.events;
  const link = s.awb ? TRACKING[s.carrier] : undefined;
  return { ...rest, trackingUrl: link && s.awb ? link(s.awb.replace(/\s+/g, "")) : null };
}

/** The steps a shipment has passed through to reach its status. */
function stepsFor(s: ShipmentRecord): ShipmentEventCode[] {
  if (s.methodType === "pickup") {
    const base: ShipmentEventCode[] = ["placed", "packed", "out_for_delivery"];
    if (s.status === "processing") return ["placed", "packed"];
    if (s.status === "delivered") return [...base, "delivered"];
    if (s.status === "failed") return [...base, "failed"];
    if (s.status === "returned") return [...base, "failed", "returned"];
    return base;
  }
  const road: ShipmentEventCode[] = s.methodType === "same_day" ? ["placed", "packed", "picked_up"] : ["placed", "packed", "picked_up", "in_transit"];
  switch (s.status) {
    case "processing":
      return ["placed", "packed"];
    case "in_transit":
      return road;
    case "out_for_delivery":
      return [...road, "out_for_delivery"];
    case "delivered":
      return [...road, "out_for_delivery", "delivered"];
    case "failed":
      return [...road, "out_for_delivery", "failed"];
    case "returned":
      return [...road, "out_for_delivery", "failed", "returned"];
  }
}

function locationFor(s: ShipmentRecord, step: ShipmentEventCode) {
  const origin = ORIGIN[s.websiteId] ?? "Mumbai";
  const dest = s.destination.city;
  switch (step) {
    case "placed":
      return `Online · ${s.websiteName}`;
    case "packed":
      return s.methodType === "pickup" ? `${s.websiteName} store` : `${origin} warehouse`;
    case "picked_up":
      return `${origin} hub · ${s.carrier}`;
    case "in_transit":
      return dest === origin ? `${origin} sorting centre` : `${dest} hub`;
    case "out_for_delivery":
      return s.methodType === "pickup" ? `${s.websiteName} store` : `${dest} · ${s.destination.pincode}`;
    case "delivered":
    case "failed":
      return s.methodType === "pickup" ? `${s.websiteName} store` : `${dest} · ${s.destination.pincode}`;
    case "returned":
      return `${origin} warehouse`;
  }
}

/** Builds a plausible timeline spread between createdAt and updatedAt (deterministic). */
function ensureEvents(s: ShipmentRecord): ShipmentEvent[] {
  if (s.events) return s.events;
  const steps = stepsFor(s);
  const start = Date.parse(s.createdAt);
  const end = Math.max(start, Date.parse(s.updatedAt));
  // Front-load packing: placed -> packed is short, the rest share the remaining time.
  const weights = steps.map((_, i) => (i === 0 ? 0 : i === 1 ? 0.12 : 0.12 + (0.88 * (i - 1)) / Math.max(1, steps.length - 2)));
  s.events = steps.map((step, i) => ({
    code: step,
    at: new Date(steps.length === 1 ? start : start + (end - start) * weights[i]!).toISOString(),
    location: locationFor(s, step),
    ...(step === "failed" && s.failureReason ? { note: s.failureReason } : {}),
  }));
  return s.events;
}

const detail = (s: ShipmentRecord): ShipmentDetail => ({ ...toShipment(s), events: [...ensureEvents(s)] });

function shipmentCounts(items: ShipmentRecord[]): ShipmentCounts {
  const c: ShipmentCounts = { all: items.length, processing: 0, in_transit: 0, out_for_delivery: 0, delivered: 0, failed: 0, returned: 0 };
  for (const s of items) c[s.status] += 1;
  return c;
}

async function findShipment(id: string) {
  const s = (await shipments()).find((x) => x.id === id);
  if (!s) throw notFound("Shipment");
  return s;
}

/* ───────────── Routes ───────────── */

registerRoutes([
  {
    method: "GET",
    path: "/delivery/methods",
    handler: async ({ query }): Promise<DeliveryMethodsResponse> => {
      const all = await methods();
      const search = str(query, "search").trim().toLowerCase();
      const websiteId = str(query, "websiteId");
      const status = str(query, "status");
      const filtered = all
        .filter((m) => !search || m.name.toLowerCase().includes(search) || m.carrier.toLowerCase().includes(search))
        .filter((m) => !websiteId || websiteId === "all" || m.websiteIds.length === 0 || m.websiteIds.includes(websiteId))
        .filter((m) => !status || status === "all" || (status === "enabled" ? m.enabled : !m.enabled));
      const { items, meta } = paginate(filtered, num(query, "page", 1), num(query, "pageSize", 10));
      return { data: await Promise.all(items.map(withNames)), meta: { ...meta, counts: methodCounts(all) } };
    },
  },
  {
    method: "POST",
    path: "/delivery/methods/presets",
    handler: async () => {
      const all = await methods();
      const created: MethodRecord[] = [];
      for (const type of ["standard", "express", "same_day", "pickup"] as DeliveryType[]) {
        const d = DELIVERY_TYPE_DEFAULTS[type];
        if (all.some((m) => m.name.toLowerCase() === d.name.toLowerCase())) continue;
        const m: MethodRecord = {
          id: newId("dlm"),
          name: d.name,
          type,
          carrier: d.carrier,
          minDays: d.minDays,
          maxDays: d.maxDays,
          rateType: type === "standard" ? "free_above" : d.rateType,
          price: d.price,
          freeAbove: type === "standard" ? 999 : null,
          coverage: d.coverage,
          regions: type === "pickup" ? ["400050"] : [],
          websiteIds: [],
          // Pickup needs a store address first, so it starts switched off.
          enabled: type !== "pickup",
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        all.push(m);
        created.push(m);
      }
      return { data: { added: created.length } };
    },
  },
  {
    method: "GET",
    path: "/delivery/methods/:id",
    handler: async ({ params }) => ({ data: await withNames(await findMethod(params.id)) }),
  },
  {
    method: "POST",
    path: "/delivery/methods",
    handler: async ({ body }) => {
      const values = await validateMethod(body as DeliveryMethodInput);
      const m: MethodRecord = { id: newId("dlm"), ...values, createdAt: nowIso(), updatedAt: nowIso() };
      (await methods()).push(m);
      return { data: await withNames(m) };
    },
  },
  {
    method: "PATCH",
    path: "/delivery/methods/:id",
    handler: async ({ params, body }) => {
      const m = await findMethod(params.id);
      const patch = body as Partial<DeliveryMethodInput>;
      const values = await validateMethod(patch, m);
      if (m.enabled && !values.enabled && (await methods()).filter((x) => x.enabled).length === 1) throw lastEnabledError();
      Object.assign(m, values, { updatedAt: nowIso() });
      return { data: await withNames(m) };
    },
  },
  {
    method: "DELETE",
    path: "/delivery/methods/:id",
    handler: async ({ params }) => {
      const all = await methods();
      const i = all.findIndex((x) => x.id === params.id);
      if (i < 0) throw notFound("Delivery method");
      const m = all[i]!;
      if (m.enabled && all.filter((x) => x.enabled).length === 1) throw lastEnabledError();
      all.splice(i, 1);
      return { data: { id: m.id, name: m.name } };
    },
  },

  {
    method: "GET",
    path: "/shipments",
    handler: async ({ query }): Promise<ShipmentsResponse> => {
      const all = await shipments();
      const search = str(query, "search").trim().toLowerCase();
      const compact = search.replace(/\s+/g, "");
      const status = str(query, "status");
      const methodType = str(query, "methodType");
      const websiteId = str(query, "websiteId");
      const filtered = all
        .filter(
          (s) =>
            !search ||
            s.id.toLowerCase().includes(search) ||
            s.orderId.toLowerCase().includes(search) ||
            s.customerName.toLowerCase().includes(search) ||
            (s.awb ?? "").replace(/\s+/g, "").toLowerCase().includes(compact),
        )
        .filter((s) => !status || status === "all" || s.status === status)
        .filter((s) => !methodType || methodType === "all" || s.methodType === methodType)
        .filter((s) => !websiteId || websiteId === "all" || s.websiteId === websiteId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const { items, meta } = paginate(filtered, num(query, "page", 1), num(query, "pageSize", 10));
      return { data: items.map(toShipment), meta: { ...meta, counts: shipmentCounts(all) } };
    },
  },
  {
    method: "GET",
    path: "/shipments/:id",
    handler: async ({ params }) => ({ data: detail(await findShipment(params.id)) }),
  },
  {
    method: "POST",
    path: "/shipments/:id/status",
    handler: async ({ params, body }) => {
      const s = await findShipment(params.id);
      const { action } = (body ?? {}) as { action?: unknown };
      if (!isShipmentAction(action)) throw badRequest("Unknown shipment action.");
      if (!SHIPMENT_TRANSITIONS[s.status].includes(action)) {
        throw conflict("invalid_transition", `This shipment is already ${s.status.replace(/_/g, " ")}, so it can’t be changed that way.`);
      }
      const events = ensureEvents(s);
      const at = nowIso();
      const next = actionResult(action, s.methodType);
      const push = (step: ShipmentEventCode, note?: string) => events.push({ code: step, at, location: locationFor(s, step), ...(note ? { note } : {}) });
      if (action === "ship") {
        if (s.methodType === "pickup") push("out_for_delivery");
        else {
          if (!s.awb) {
            const n = String(Date.parse(at));
            s.awb = s.carrier === "Local partner" ? `LC-${n.slice(-6)}` : `${n.slice(-12, -8)} ${n.slice(-8, -4)} ${n.slice(-4)}`;
          }
          push("picked_up");
        }
      } else if (action === "deliver") push("delivered");
      else if (action === "retry") {
        s.failureReason = null;
        push("out_for_delivery", "Delivery re-attempt requested by the store.");
      } else {
        if (s.status !== "failed") {
          s.failureReason ??= "Marked for return by the store.";
          push("failed", "Marked for return by the store.");
        }
        push("returned");
      }
      s.status = next;
      if (s.status === "delivered" || s.status === "returned") s.eta = null;
      s.updatedAt = at;
      return { data: detail(s) };
    },
  },
]);
