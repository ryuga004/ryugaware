/**
 * Dummy backend routes for the Templates module (system-owned, read-only).
 *   GET /templates?search&category&page&pageSize
 *   GET /templates/:id
 */
import { db } from "@/lib/api/dummy/db";
import { notFound } from "@/lib/api/dummy/errors";
import { registerRoutes } from "@/lib/api/dummy/router";
import { num, paginate, str } from "@/lib/api/dummy/utils";
import type { Template, TemplateCategoryCount, TemplatesResponse } from "./types";

const templates = () => db.collection<Template>("templates");

registerRoutes([
  {
    method: "GET",
    path: "/templates",
    handler: async ({ query }): Promise<TemplatesResponse> => {
      const all = (await templates()).filter((t) => t.status === "published");
      const search = str(query, "search").trim().toLowerCase();
      const category = str(query, "category");

      const filtered = all
        .filter((t) => !search || t.name.toLowerCase().includes(search) || t.description.toLowerCase().includes(search))
        .filter((t) => !category || category === "all" || t.category === category);

      const categories: TemplateCategoryCount[] = [
        { id: "all", label: "All", count: all.length },
        { id: "ecommerce", label: "Ecommerce", count: all.filter((t) => t.category === "ecommerce").length },
        { id: "services", label: "Services", count: all.filter((t) => t.category === "services").length },
      ];
      const { items, meta } = paginate(filtered, num(query, "page", 1), num(query, "pageSize", 6));
      return { data: items, meta: { ...meta, categories } };
    },
  },
  {
    method: "GET",
    path: "/templates/:id",
    handler: async ({ params }) => {
      const t = (await templates()).find((x) => x.id === params.id);
      if (!t) throw notFound("Template");
      return { data: t };
    },
  },
]);
