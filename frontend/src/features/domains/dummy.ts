/**
 * Dummy backend routes for Domains.
 *   GET    /domains?search&status&websiteId&page&pageSize
 *   GET    /domains/:id                 (includes the DNS records to add)
 *   POST   /domains                     { hostname, websiteId }
 *   POST   /domains/:id/verify          re-checks DNS: pending -> verifying -> active
 *   PATCH  /domains/:id                 { primary: true }
 *   DELETE /domains/:id
 */
import { badRequest, conflict, notFound } from "@/lib/api/dummy/errors";
import { db } from "@/lib/api/dummy/db";
import { code, isoAgo, rng } from "@/lib/api/dummy/fake";
import { registerRoutes } from "@/lib/api/dummy/router";
import { registerScenario } from "@/lib/api/dummy/scenario";
import { newId, nowIso, num, paginate, str } from "@/lib/api/dummy/utils";
import type { Website } from "@/features/websites/types";
import { APEX_IP, CNAME_TARGET } from "./constants";
import { HOSTNAME_PATTERN, normaliseHostname } from "./schemas";
import type { AddDomainInput, DnsRecord, Domain, DomainCounts, DomainDetail, DomainStatus, DomainsResponse } from "./types";

const FILE = "domains";
const domains = () => db.collection<Domain>(FILE);

/* Large scenario: ~240 domains spread over the seed websites. */
registerScenario<Domain[]>(FILE, {
  large: (seed) => {
    const r = rng(7);
    const sites = [...new Map(seed.map((d) => [d.websiteId, d.websiteName])).entries()];
    const words = ["shop", "store", "buy", "www", "go", "my", "get", "the", "order", "hello"];
    const tlds = ["com", "in", "co", "store", "shop", "co.in"];
    const out = [...seed];
    for (let i = 0; i < 232; i++) {
      const [websiteId, websiteName] = r.pick(sites);
      const base = websiteName.toLowerCase().replace(/[^a-z]+/g, "");
      const status = r.weighted<DomainStatus>([["active", 6], ["pending_dns", 2], ["verifying", 1], ["failed", 1]]);
      out.push({
        id: `dom_L${code(r, 6)}${i}`,
        hostname: `${r.pick(words)}${i}.${base}.${r.pick(tlds)}`,
        websiteId,
        websiteName,
        primary: false,
        status,
        ssl: status === "active" ? "issued" : status === "verifying" ? "pending" : "none",
        failureReason: status === "failed" ? "No CNAME record was found for this domain." : null,
        lastCheckedAt: status === "pending_dns" && r.chance(0.5) ? null : isoAgo(r.int(5, 60 * 24 * 20)),
        createdAt: isoAgo(r.int(60, 60 * 24 * 300)),
      });
    }
    return out;
  },
});

/** Root domains (example.com, example.co.in) need an A record; subdomains use a CNAME. */
function isApex(hostname: string) {
  const parts = hostname.split(".");
  return parts.length === 2 || (parts.length === 3 && /\.(co|org|net)\.(in|uk)$/.test(hostname));
}

/** The records a customer must add. Found-flags follow the domain status so the drawer tells a coherent story. */
function recordsFor(d: Domain): DnsRecord[] {
  const found = d.status === "active" || d.status === "verifying";
  const verify: DnsRecord = { type: "TXT", host: `_ryugaware.${d.hostname}`, value: `rw-verify=${d.id.toLowerCase()}`, found: d.status !== "pending_dns" };
  return isApex(d.hostname)
    ? [{ type: "A", host: "@", value: APEX_IP, found }, verify]
    : [{ type: "CNAME", host: d.hostname.split(".")[0]!, value: CNAME_TARGET, found }, verify];
}

const detail = (d: Domain): DomainDetail => ({ ...d, records: recordsFor(d) });

function counts(items: Domain[]): DomainCounts {
  const c: DomainCounts = { all: items.length, active: 0, pending_dns: 0, verifying: 0, failed: 0 };
  for (const d of items) c[d.status] += 1;
  return c;
}

async function find(id: string) {
  const d = (await domains()).find((x) => x.id === id);
  if (!d) throw notFound("Domain");
  return d;
}

/** Keeps websites.customDomain in step with the primary domain (what the Websites list shows). */
async function syncWebsite(websiteId: string) {
  const all = await domains();
  const site = (await db.collection<Website>("websites")).find((w) => w.id === websiteId);
  if (site) site.customDomain = all.find((d) => d.websiteId === websiteId && d.primary)?.hostname ?? null;
}

registerRoutes([
  {
    method: "GET",
    path: "/domains",
    handler: async ({ query }): Promise<DomainsResponse> => {
      const all = await domains();
      const search = str(query, "search").trim().toLowerCase();
      const status = str(query, "status");
      const websiteId = str(query, "websiteId");
      const filtered = all
        .filter((d) => !search || d.hostname.includes(search) || d.websiteName.toLowerCase().includes(search))
        .filter((d) => !status || status === "all" || d.status === status)
        .filter((d) => !websiteId || websiteId === "all" || d.websiteId === websiteId)
        // Problems first (failed, pending), then newest.
        .sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));
      const { items, meta } = paginate(filtered, num(query, "page", 1), num(query, "pageSize", 10));
      return { data: items, meta: { ...meta, counts: counts(all) } };
    },
  },
  {
    method: "GET",
    path: "/domains/:id",
    handler: async ({ params }) => ({ data: detail(await find(params.id)) }),
  },
  {
    method: "POST",
    path: "/domains",
    handler: async ({ body }) => {
      const input = body as AddDomainInput;
      const hostname = normaliseHostname(input.hostname ?? "");
      const fieldErrors: Record<string, string> = {};
      if (!HOSTNAME_PATTERN.test(hostname)) fieldErrors.hostname = "Enter a domain like shop.example.com.";
      else if (hostname.endsWith(".ryugaware.com")) fieldErrors.hostname = "Ryugaware addresses are already connected. Use a domain you own.";
      const site = (await db.collection<Website>("websites")).find((w) => w.id === input.websiteId);
      if (!site) fieldErrors.websiteId = "Choose a website.";
      if (Object.keys(fieldErrors).length) throw badRequest("Please fix the highlighted fields.", fieldErrors);

      const all = await domains();
      const existing = all.find((d) => d.hostname === hostname);
      if (existing) {
        throw conflict("domain_taken", "That domain is already connected.", {
          hostname: existing.websiteId === site!.id ? "Already connected to this website." : `Already connected to ${existing.websiteName}.`,
        });
      }
      const created: Domain = {
        id: newId("dom"),
        hostname,
        websiteId: site!.id,
        websiteName: site!.name,
        primary: false,
        status: "pending_dns",
        ssl: "none",
        failureReason: null,
        lastCheckedAt: null,
        createdAt: nowIso(),
      };
      all.unshift(created);
      return { data: detail(created) };
    },
  },
  {
    method: "POST",
    path: "/domains/:id/verify",
    handler: async ({ params }) => {
      const d = await find(params.id);
      // Simulated DNS propagation: each check moves the domain one step forward.
      if (d.status === "pending_dns" || d.status === "failed") {
        d.status = "verifying";
        d.ssl = "pending";
        d.failureReason = null;
      } else if (d.status === "verifying") {
        d.status = "active";
        d.ssl = "issued";
        const all = await domains();
        if (!all.some((x) => x.websiteId === d.websiteId && x.primary)) {
          d.primary = true;
          await syncWebsite(d.websiteId);
        }
      }
      d.lastCheckedAt = nowIso();
      return { data: detail(d) };
    },
  },
  {
    method: "PATCH",
    path: "/domains/:id",
    handler: async ({ params, body }) => {
      const d = await find(params.id);
      const { primary } = body as { primary?: boolean };
      if (primary) {
        if (d.status !== "active") throw badRequest("Only active domains can be primary.");
        for (const x of await domains()) if (x.websiteId === d.websiteId) x.primary = x.id === d.id;
        await syncWebsite(d.websiteId);
      }
      return { data: detail(d) };
    },
  },
  {
    method: "DELETE",
    path: "/domains/:id",
    handler: async ({ params }) => {
      const all = await domains();
      const i = all.findIndex((x) => x.id === params.id);
      if (i < 0) throw notFound("Domain");
      const [removed] = all.splice(i, 1);
      if (removed!.primary) await syncWebsite(removed!.websiteId);
      return { data: { id: removed!.id, hostname: removed!.hostname } };
    },
  },
]);

function rank(d: Domain) {
  return d.status === "failed" ? 0 : d.status === "pending_dns" ? 1 : d.status === "verifying" ? 2 : 3;
}
