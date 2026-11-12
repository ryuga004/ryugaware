import type { Paginated } from "@/lib/api/types";

export type WebsiteStatus = "live" | "draft" | "paused";
export type WebsiteType = "ecommerce" | "services";

export interface Website {
  id: string;
  name: string;
  type: WebsiteType;
  status: WebsiteStatus;
  subdomain: string;
  url: string;
  customDomain: string | null;
  templateId: string;
  templateName: string;
  thumbnailTheme: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  lastPublishedAt: string | null;
}

export interface WebsiteFilters {
  search: string;
  status: WebsiteStatus | "all";
  type: WebsiteType | "all";
  page: number;
  pageSize: number;
}

export interface WebsiteCounts {
  all: number;
  live: number;
  draft: number;
  paused: number;
}

export type WebsitesResponse = Paginated<Website, { counts: WebsiteCounts }>;

export interface CreateWebsiteInput {
  name: string;
  subdomain: string;
  templateId: string;
}

export interface UpdateWebsiteInput {
  name?: string;
  paused?: boolean;
}

export interface SubdomainCheck {
  subdomain: string;
  available: boolean;
  suggestion?: string;
}

/** Lightweight list for website pickers (scope selects, filters) in other sections. */
export interface WebsiteOption {
  id: string;
  name: string;
  /** Custom domain when connected, otherwise the free subdomain host. */
  host: string;
  status: WebsiteStatus;
}
