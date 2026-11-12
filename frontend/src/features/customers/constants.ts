import type { StatusMap } from "@/components/platform/StatusBadge";
import type { SelectOption } from "@/components/ui/Select";
import type { CustomerOrderStatus, CustomerSort, CustomerStatus, SignInMethod } from "./types";

export const CUSTOMER_STATUS: StatusMap<CustomerStatus> = {
  active: { label: "Active", tone: "success" },
  blocked: { label: "Blocked", tone: "danger" },
  unverified: { label: "Unverified", tone: "warning" },
};

export const ORDER_STATUS: StatusMap<CustomerOrderStatus> = {
  processing: { label: "Processing", tone: "neutral" },
  shipped: { label: "Shipped", tone: "warning" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const SIGN_IN_LABEL: Record<SignInMethod, string> = { google: "Google", email: "Email" };

export const CUSTOMER_STATUS_OPTIONS: SelectOption<CustomerStatus | "all">[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "blocked", label: "Blocked" },
  { value: "unverified", label: "Unverified" },
];

export const SIGN_IN_OPTIONS: SelectOption<SignInMethod | "all">[] = [
  { value: "all", label: "All sign-in methods" },
  { value: "google", label: "Google" },
  { value: "email", label: "Email" },
];

/** Sort dropdown; the value encodes key and direction ("joined:desc"). Column headers set the same state. */
export const SORT_OPTIONS: SelectOption<`${CustomerSort["key"]}:${CustomerSort["dir"]}`>[] = [
  { value: "joined:desc", label: "Newest first" },
  { value: "joined:asc", label: "Oldest first" },
  { value: "spent:desc", label: "Highest spend" },
  { value: "spent:asc", label: "Lowest spend" },
  { value: "lastActive:desc", label: "Recently active" },
  { value: "lastActive:asc", label: "Least recently active" },
];

export const CUSTOMER_PAGE_SIZES = [10, 25, 50, 100];

export const avatarSrc = (key: string) => `/images/avatars/${key}.webp`;
