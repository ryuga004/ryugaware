import { Badge } from "@/components/ui/Badge";
import { STATUS_LABEL, STATUS_TONE } from "../constants";
import type { WebsiteStatus } from "../types";

export function StatusBadge({ status }: { status: WebsiteStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
