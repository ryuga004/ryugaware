/**
 * Dummy backend routes for the Websites module.
 * Mirrors a REST contract:
 *   GET    /websites?search&status&type&page&pageSize
 *   GET    /websites/check-subdomain?subdomain=
 *   GET    /websites/options
 *   GET    /websites/:id
 *   POST   /websites
 *   PATCH  /websites/:id
 *   DELETE /websites/:id
 */
import { BASE_DOMAIN } from "@/lib/api/config";
import { badRequest, conflict, forbidden, notFound } from "@/lib/api/dummy/errors";
import { db } from "@/lib/api/dummy/db";
import { registerRoutes } from "@/lib/api/dummy/router";
import { newId, nowIso, num, paginate, str } from "@/lib/api/dummy/utils";
import type { Template } from "@/features/templates/types";
import type {
  CreateWebsiteInput,
  SubdomainCheck,
  UpdateWebsiteInput,
  Website,
  WebsiteCounts,
  WebsiteOption,
  WebsitesResponse,
} from "./types";

const RESERVED = new Set(["www", "app", "admin", "api", "mail", "support", "status"]);
const SUBDOMAIN_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

const websites = () => db.collection<Website>("websites");

function counts(items: Website[]): WebsiteCounts {
  return {
    all: items.length,
    live: items.filter((w) => w.status === "live").length,
    draft: items.filter((w) => w.status === "draft").length,
    paused: items.filter((w) => w.status === "paused").length,
  };
}

async function checkSubdomain(subdomain: string): Promise<SubdomainCheck> {
  const items = await websites();
  const taken = (s: string) => RESERVED.has(s) || items.some((w) => w.subdomain === s);
  if (!taken(subdomain)) return { subdomain, available: true };
  let n = 2;
  while (taken(`${subdomain}-${n}`)) n += 1;
  return { subdomain, available: false, suggestion: `${subdomain}-${n}` };
}

registerRoutes([
  {
    method: "GET",
    path: "/websites",
    handler: async ({ query }): Promise<WebsitesResponse> => {
      const all = await websites();
      const search = str(query, "search").trim().toLowerCase();
      const status = str(query, "status");
      const type = str(query, "type");

      const filtered = all
        .filter((w) => !search || w.name.toLowerCase().includes(search) || w.subdomain.includes(search))
        .filter((w) => !status || status === "all" || w.status === status)
        .filter((w) => !type || type === "all" || w.type === type)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      const { items, meta } = paginate(filtered, num(query, "page", 1), num(query, "pageSize", 6));
      return { data: items, meta: { ...meta, counts: counts(all) } };
    },
  },
  {
    method: "GET",
    path: "/websites/check-subdomain",
    handler: async ({ query }) => {
      const subdomain = str(query, "subdomain").toLowerCase();
      if (!SUBDOMAIN_RE.test(subdomain)) {
        throw badRequest("Use 3–40 lowercase letters, numbers or hyphens.", { subdomain: "Invalid web address." });
      }
      return { data: await checkSubdomain(subdomain) };
    },
  },
  {
    method: "GET",
    path: "/websites/options",
    handler: async (): Promise<{ data: WebsiteOption[] }> => {
      const all = await websites();
      const data = [...all]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((w) => ({ id: w.id, name: w.name, host: w.customDomain ?? w.url.replace("https://", ""), status: w.status }));
      return { data };
    },
  },
  {
    method: "GET",
    path: "/websites/:id",
    handler: async ({ params }) => {
      const site = (await websites()).find((w) => w.id === params.id);
      if (!site) throw notFound("Website");
      return { data: site };
    },
  },
  {
    method: "POST",
    path: "/websites",
    handler: async ({ body }) => {
      const input = body as CreateWebsiteInput;
      const items = await websites();
      const license = await db.document<{ allowance: number }>("license");
      const name = input.name?.trim() ?? "";
      const subdomain = input.subdomain?.trim().toLowerCase() ?? "";

      const fieldErrors: Record<string, string> = {};
      if (!name) fieldErrors.name = "Enter a website name.";
      else if (name.length > 60) fieldErrors.name = "Use 60 characters or fewer.";
      if (!SUBDOMAIN_RE.test(subdomain)) fieldErrors.subdomain = "Use 3–40 lowercase letters, numbers or hyphens.";
      const templates = await db.collection<Template>("templates");
      const template = templates.find((t) => t.id === input.templateId);
      if (!template) fieldErrors.templateId = "Choose a template.";
      if (Object.keys(fieldErrors).length) throw badRequest("Please fix the highlighted fields.", fieldErrors);

      if (items.length >= license.allowance) {
        throw forbidden("license_limit_reached", `Your license includes ${license.allowance} websites and all are in use.`);
      }
      const check = await checkSubdomain(subdomain);
      if (!check.available) {
        throw conflict("subdomain_taken", "That web address is already taken.", {
          subdomain: `Already taken. Try ${check.suggestion}`,
        });
      }

      const now = nowIso();
      const created: Website = {
        id: newId("web"),
        name,
        type: template!.category,
        status: "draft",
        subdomain,
        url: `https://${subdomain}.${BASE_DOMAIN}`,
        customDomain: null,
        templateId: template!.id,
        templateName: template!.name,
        thumbnailTheme: template!.thumbnailTheme,
        ownerId: "usr_01HQ8Z3K",
        createdAt: now,
        updatedAt: now,
        lastPublishedAt: null,
      };
      items.unshift(created);
      return { data: created };
    },
  },
  {
    method: "PATCH",
    path: "/websites/:id",
    handler: async ({ params, body }) => {
      const input = body as UpdateWebsiteInput;
      const site = (await websites()).find((w) => w.id === params.id);
      if (!site) throw notFound("Website");
      if (input.name !== undefined) {
        const name = input.name.trim();
        if (!name) throw badRequest("Enter a website name.", { name: "Enter a website name." });
        if (name.length > 60) throw badRequest("Name is too long.", { name: "Use 60 characters or fewer." });
        site.name = name;
      }
      if (input.paused !== undefined) {
        site.status = input.paused ? "paused" : site.lastPublishedAt ? "live" : "draft";
      }
      site.updatedAt = nowIso();
      return { data: site };
    },
  },
  {
    method: "DELETE",
    path: "/websites/:id",
    handler: async ({ params }) => {
      const items = await websites();
      const index = items.findIndex((w) => w.id === params.id);
      if (index < 0) throw notFound("Website");
      const [removed] = items.splice(index, 1);
      return { data: { id: removed.id, name: removed.name, deleted: true } };
    },
  },
]);
