/**
 * Dummy backend routes for Contact details.
 *   GET    /contact?scope=default|<websiteId>   effective details for the scope
 *   PUT    /contact/:scope                      ContactInput; for a website this creates / updates its override
 *   DELETE /contact/:scope                      website only: drop the override (inherit the default again)
 */
import { badRequest, notFound } from "@/lib/api/dummy/errors";
import { db } from "@/lib/api/dummy/db";
import { CITIES, FIRST_NAMES, isoAgo, LAST_NAMES, rng } from "@/lib/api/dummy/fake";
import { registerRoutes } from "@/lib/api/dummy/router";
import { registerScenario } from "@/lib/api/dummy/scenario";
import { nowIso } from "@/lib/api/dummy/utils";
import type { Website } from "@/features/websites/types";
import { INDIAN_STATES } from "./constants";
import { EMAIL_PATTERN, MOBILE_PATTERN, normalisePhone, PHONE_PATTERN, PIN_PATTERN } from "./schemas";
import type { ContactDetails, ContactDocument, ContactInput, ContactScopeResponse } from "./types";

const FILE = "contact";
const doc = () => db.document<ContactDocument>(FILE);

/** The 8 seed websites (websites always use their normal seed). */
const SEED_SITES: [string, string, string][] = [
  ["web_01J8A1", "Bloom Studio", "bloomstudio.com"],
  ["web_01J8A2", "Northwind Coffee", "northwindcoffee.co"],
  ["web_01J8A3", "Atlas Outdoor", "atlasoutdoor.in"],
  ["web_01J8A4", "Fresh Basket", "freshbasket.in"],
  ["web_01J8A5", "Lotus Yoga Studio", "lotusyoga.in"],
  ["web_01J8A6", "Kala Handloom", "kalahandloom.com"],
  ["web_01J8A7", "Dr. Mehta Clinic", "mehtaclinic.in"],
  ["web_01J8A8", "Spice Route Pantry", "spiceroutepantry.com"],
];

registerScenario<ContactDocument>(FILE, {
  // Nothing set up yet: onboarding.
  empty: () => ({ default: null, overrides: {} }),
  // Only the required fields.
  small: (seed) => ({
    default: {
      ...seed.default!,
      contactPerson: "",
      whatsappSameAsPhone: false,
      whatsapp: "",
      supportHours: "",
      addressLine2: "",
      updatedAt: isoAgo(60 * 24 * 2),
    },
    overrides: {},
  }),
  // Long values everywhere and an override for every website.
  large: (seed) => {
    const r = rng(23);
    const overrides: Record<string, ContactDetails> = {};
    SEED_SITES.forEach(([id, name, domain], i) => {
      const [city, state] = r.pick(CITIES);
      const phone = `${r.int(7, 9)}${String(r.int(100000000, 999999999))}`;
      overrides[id] = {
        businessName: `${name} Retail Private Limited`,
        contactPerson: `${r.pick(FIRST_NAMES)} ${r.pick(LAST_NAMES)}`,
        supportEmail: `customer-support.${i + 1}@${domain}`,
        phone,
        whatsappSameAsPhone: i % 3 !== 0,
        whatsapp: i % 3 === 0 ? `9${String(r.int(100000000, 999999999))}` : "",
        supportHours: "Mon–Sat, 9:30 am – 8:30 pm IST; Sun, 11 am – 5 pm",
        addressLine1: `Unit ${r.int(101, 1204)}, ${r.pick(["Prestige", "Lodha", "Brigade", "Godrej", "Raheja"])} ${r.pick(["Trade Centre", "Business Park", "Corporate Tower", "Tech Plaza"])}, ${r.pick(["Ring Road", "MG Road", "Station Road", "Link Road"])}`,
        addressLine2: `Near ${r.pick(["Central Mall", "Metro Station Gate 2", "City Hospital", "Municipal Garden"])}, ${r.pick(["Sector 18", "Phase II", "Block C", "Ward 7"])}`,
        city,
        state,
        pinCode: String(r.int(110001, 855117)),
        show: { footer: true, contactPage: i % 4 !== 3, invoices: i % 2 === 0 },
        updatedAt: isoAgo(r.int(60, 60 * 24 * 40)),
      };
    });
    return {
      default: {
        ...seed.default!,
        businessName: "Bloom Studio Retail Group Private Limited",
        contactPerson: "Priya Sharma (Head of Customer Experience)",
        supportEmail: "customer-support-and-returns@bloomstudio-retail-group.com",
        addressLine1: "Unit 1204, Twelfth Floor, Kohinoor Square, N. C. Kelkar Road",
        addressLine2: "Opposite Shivaji Park, Dadar West",
        pinCode: "400028",
        supportHours: "Mon–Sat, 9:30 am – 8:30 pm IST; Sun, 11 am – 5 pm",
        updatedAt: isoAgo(45),
      },
      overrides,
    };
  },
});

async function websites() {
  return db.collection<Website>("websites");
}

async function websiteFor(scope: string) {
  if (scope === "default") return null;
  const site = (await websites()).find((w) => w.id === scope);
  if (!site) throw notFound("Website");
  return site;
}

async function respond(scope: string): Promise<ContactScopeResponse> {
  const d = await doc();
  const site = await websiteFor(scope);
  const sites = await websites();
  const own = site ? d.overrides[site.id] : d.default;
  return {
    scope,
    websiteName: site?.name ?? null,
    configured: d.default !== null,
    inherited: Boolean(site) && !own,
    details: own ?? d.default,
    overrides: Object.entries(d.overrides)
      .map(([websiteId, s]) => ({ websiteId, websiteName: sites.find((w) => w.id === websiteId)?.name ?? websiteId, updatedAt: s.updatedAt }))
      .sort((a, b) => a.websiteName.localeCompare(b.websiteName)),
  };
}

function validate(raw: Partial<ContactInput>): ContactDetails {
  const s = (k: keyof ContactInput) => String(raw[k] ?? "").trim();
  const v: ContactInput = {
    businessName: s("businessName"),
    contactPerson: s("contactPerson"),
    supportEmail: s("supportEmail").toLowerCase(),
    phone: normalisePhone(s("phone")),
    whatsappSameAsPhone: Boolean(raw.whatsappSameAsPhone),
    whatsapp: raw.whatsappSameAsPhone ? "" : normalisePhone(s("whatsapp")),
    supportHours: s("supportHours"),
    addressLine1: s("addressLine1"),
    addressLine2: s("addressLine2"),
    city: s("city"),
    state: s("state"),
    pinCode: s("pinCode"),
    show: { footer: Boolean(raw.show?.footer), contactPage: Boolean(raw.show?.contactPage), invoices: Boolean(raw.show?.invoices) },
  };
  const fe: Record<string, string> = {};
  if (!v.businessName) fe.businessName = "Enter your business name.";
  else if (v.businessName.length > 80) fe.businessName = "Business name can be up to 80 characters.";
  if (!EMAIL_PATTERN.test(v.supportEmail)) fe.supportEmail = "Enter an email like support@yourbrand.com.";
  if (!PHONE_PATTERN.test(v.phone)) fe.phone = "Enter a 10-digit phone number.";
  if (v.whatsapp && !MOBILE_PATTERN.test(v.whatsapp)) fe.whatsapp = "Enter a 10-digit mobile number.";
  if (v.whatsappSameAsPhone && PHONE_PATTERN.test(v.phone) && !MOBILE_PATTERN.test(v.phone))
    fe.whatsappSameAsPhone = "WhatsApp needs a mobile number. This phone looks like a landline.";
  if (!v.addressLine1) fe.addressLine1 = "Enter the street address.";
  if (!v.city) fe.city = "Enter the city.";
  if (!(INDIAN_STATES as readonly string[]).includes(v.state)) fe.state = "Choose a state.";
  if (!PIN_PATTERN.test(v.pinCode)) fe.pinCode = "Enter a 6-digit PIN code.";
  if (Object.keys(fe).length) throw badRequest("Please fix the highlighted fields.", fe);
  return { ...v, updatedAt: nowIso() };
}

registerRoutes([
  {
    method: "GET",
    path: "/contact",
    handler: async ({ query }) => ({ data: await respond(String(query.scope || "default")) }),
  },
  {
    method: "PUT",
    path: "/contact/:scope",
    handler: async ({ params, body }) => {
      const d = await doc();
      const site = await websiteFor(params.scope);
      if (site && !d.default) throw badRequest("Add the default contact details first.");
      const next = validate((body ?? {}) as Partial<ContactInput>);
      if (site) d.overrides[site.id] = next;
      else d.default = next;
      return { data: await respond(params.scope) };
    },
  },
  {
    method: "DELETE",
    path: "/contact/:scope",
    handler: async ({ params }) => {
      const d = await doc();
      const site = await websiteFor(params.scope);
      if (!site) throw badRequest("The default details can’t be reset.");
      delete d.overrides[site.id];
      return { data: await respond(params.scope) };
    },
  },
]);
