import type { Paginated } from "@/lib/api/types";

export type TemplateCategory = "ecommerce" | "services";

export interface Template {
  id: string;
  slug: string;
  name: string;
  category: TemplateCategory;
  description: string;
  pages: number;
  features: string[];
  paymentMethods: string[];
  thumbnailTheme: string;
  previewUrl: string;
  version: string;
  status: "published" | "draft";
  createdAt: string;
  updatedAt: string;
}

export interface TemplateFilters {
  search: string;
  category: TemplateCategory | "all";
  page: number;
  pageSize: number;
}

export interface TemplateCategoryCount {
  id: TemplateCategory | "all";
  label: string;
  count: number;
}

export type TemplatesResponse = Paginated<Template, { categories: TemplateCategoryCount[] }>;
