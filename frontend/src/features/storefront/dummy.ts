/**
 * Dummy backend routes for website content.
 *   GET /site-content/:websiteId
 *   PUT /site-content/:websiteId
 *
 * Content is created when a website is created (see `features/websites/dummy.ts`). Seeded demo
 * websites predate this feature, so the GET backfills them on first open — demo convenience only;
 * a real backend would have written the rows at creation time.
 */
import { db } from "@/lib/api/dummy/db";
import { notFound } from "@/lib/api/dummy/errors";
import { registerRoutes } from "@/lib/api/dummy/router";
import { nowIso } from "@/lib/api/dummy/utils";
import type { Website } from "@/features/websites/types";
import { instantiateSite, previewSite } from "./instantiate";
import { getTemplate } from "./templates";
import { ECOMMERCE_TEMPLATE } from "./templates/ecommerce/manifest";
import { toCommerce } from "@/features/website-settings/commerce";
import { previewStoreSettings, readSettings } from "@/features/website-settings/dummy";
import type { SiteContent, StorefrontResponse } from "./types";

const contents = () => db.collection<SiteContent>("site-content");

/** Visibly different branding per demo website, so one template clearly produces different stores. */
const DEMO_BRANDING = [
  { primary: "#17352f", secondary: "#c08a4e" },
  { primary: "#2f3b57", secondary: "#c2714e" },
  { primary: "#4a2b33", secondary: "#b08a5e" },
  { primary: "#22402b", secondary: "#a9803f" },
  { primary: "#303a3f", secondary: "#bf8d55" },
  { primary: "#3d2f4a", secondary: "#c09a4e" },
];

export async function readSiteContent(websiteId: string): Promise<SiteContent> {
  const all = await contents();
  const existing = all.find((c) => c.websiteId === websiteId);
  if (existing) return existing;

  const website = (await db.collection<Website>("websites")).find((w) => w.id === websiteId);
  if (!website) throw notFound("Website");

  const templateId = getTemplate(website.templateId) ? website.templateId : website.type === "ecommerce" ? ECOMMERCE_TEMPLATE.id : null;
  if (!templateId) {
    throw notFound(`Editable content for ${website.name}. Its template does not support the website editor yet`);
  }

  const index = Math.abs([...websiteId].reduce((n, ch) => n + ch.charCodeAt(0), 0)) % DEMO_BRANDING.length;
  const created = instantiateSite({
    websiteId,
    templateId,
    brandName: website.name,
    ...DEMO_BRANDING[index],
    now: website.updatedAt ?? nowIso(),
  });
  all.push(created);
  return created;
}

registerRoutes([
  {
    // The delivery read: one host (here, a subdomain) resolved to the website and its content.
    // "preview" serves the template's own demo content, with no website behind it.
    method: "GET",
    path: "/storefront/:site",
    handler: async ({ params }): Promise<{ data: StorefrontResponse }> => {
      if (params.site === "preview") {
        return {
          data: {
            websiteId: "preview",
            name: ECOMMERCE_TEMPLATE.defaultTheme.brandName,
            subdomain: "preview",
            status: "draft",
            preview: true,
            content: previewSite(ECOMMERCE_TEMPLATE.id, nowIso()),
            commerce: toCommerce(await previewStoreSettings()),
          },
        };
      }
      const website = (await db.collection<Website>("websites")).find((w) => w.subdomain === params.site || w.id === params.site);
      if (!website) throw notFound("Website");
      return {
        data: {
          websiteId: website.id,
          name: website.name,
          subdomain: website.subdomain,
          status: website.status,
          preview: false,
          content: await readSiteContent(website.id),
          commerce: toCommerce(await readSettings(website.id)),
        },
      };
    },
  },
  {
    method: "GET",
    path: "/site-content/:websiteId",
    handler: async ({ params }) => ({ data: await readSiteContent(params.websiteId) }),
  },
  {
    method: "PUT",
    path: "/site-content/:websiteId",
    handler: async ({ params, body }) => {
      const all = await contents();
      const index = all.findIndex((c) => c.websiteId === params.websiteId);
      if (index < 0) throw notFound("Website content");
      const incoming = body as SiteContent;
      const updated: SiteContent = { ...incoming, websiteId: params.websiteId, updatedAt: nowIso() };
      all[index] = updated;
      return { data: updated };
    },
  },
]);
