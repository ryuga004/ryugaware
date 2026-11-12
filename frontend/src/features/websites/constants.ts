import type { SelectOption } from "@/components/ui/Select";
import type { BadgeTone } from "@/components/ui/Badge";
import type { WebsiteStatus, WebsiteType } from "./types";

export const STATUS_OPTIONS: SelectOption<WebsiteStatus | "all">[] = [
  { value: "all", label: "All statuses" },
  { value: "live", label: "Live" },
  { value: "draft", label: "Draft" },
  { value: "paused", label: "Paused" },
];

export const TYPE_OPTIONS: SelectOption<WebsiteType | "all">[] = [
  { value: "all", label: "All types" },
  { value: "ecommerce", label: "Ecommerce" },
  { value: "services", label: "Services" },
];

export const STATUS_TONE: Record<WebsiteStatus, BadgeTone> = { live: "success", draft: "neutral", paused: "warning" };
export const STATUS_LABEL: Record<WebsiteStatus, string> = { live: "Live", draft: "Draft", paused: "Paused" };
export const TYPE_LABEL: Record<WebsiteType, string> = { ecommerce: "Ecommerce", services: "Services" };
export const PAGE_SIZE_OPTIONS = [6, 12, 24];
