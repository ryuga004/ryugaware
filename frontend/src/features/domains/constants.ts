import type { StatusMap } from "@/components/platform/StatusBadge";
import type { SelectOption } from "@/components/ui/Select";
import type { DomainStatus, SslStatus } from "./types";

export const DOMAIN_STATUS: StatusMap<DomainStatus> = {
  active: { label: "Active", tone: "success" },
  pending_dns: { label: "Pending DNS", tone: "warning" },
  verifying: { label: "Verifying", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
};

export const SSL_STATUS: StatusMap<SslStatus> = {
  issued: { label: "Issued", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  none: { label: "None", tone: "neutral" },
};

export const DOMAIN_STATUS_OPTIONS: SelectOption<DomainStatus | "all">[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending_dns", label: "Pending DNS" },
  { value: "verifying", label: "Verifying" },
  { value: "failed", label: "Failed" },
];

export const DOMAIN_PAGE_SIZES = [10, 25, 50];

/** Where customers point their DNS. */
export const CNAME_TARGET = "sites.ryugaware.com";
export const APEX_IP = "76.223.41.12";
