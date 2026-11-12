import type { Paginated } from "@/lib/api/types";

export type DomainStatus = "active" | "pending_dns" | "verifying" | "failed";
export type SslStatus = "issued" | "pending" | "none";

export interface DnsRecord {
  type: "A" | "CNAME" | "TXT";
  host: string;
  value: string;
  /** Whether the last check found this record. */
  found: boolean;
}

export interface Domain {
  id: string;
  hostname: string;
  websiteId: string;
  websiteName: string;
  /** The address the website redirects to. One per website, active domains only. */
  primary: boolean;
  status: DomainStatus;
  ssl: SslStatus;
  failureReason: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
}

/** Detail response: the domain plus the DNS records the customer must add. */
export interface DomainDetail extends Domain {
  records: DnsRecord[];
}

export interface DomainFilters {
  search: string;
  status: DomainStatus | "all";
  websiteId: string;
  page: number;
  pageSize: number;
}

export type DomainCounts = Record<DomainStatus | "all", number>;

export type DomainsResponse = Paginated<Domain, { counts: DomainCounts }>;

export interface AddDomainInput {
  hostname: string;
  websiteId: string;
}
