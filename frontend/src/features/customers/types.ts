import type { Paginated } from "@/lib/api/types";

/** A shopper who signed up on one of the merchant's websites (not a Ryugaware account). */
export type CustomerStatus = "active" | "blocked" | "unverified";
export type SignInMethod = "google" | "email";
export type CustomerSortKey = "joined" | "spent" | "lastActive";
export type SortDir = "asc" | "desc";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** Avatar image key (a1…a12) when the customer uploaded a photo; initials otherwise. */
  avatar: string | null;
  websiteId: string;
  websiteName: string;
  signInMethod: SignInMethod;
  status: CustomerStatus;
  /** Whether the email address was confirmed (decides the status after an unblock). */
  verified: boolean;
  orders: number;
  totalSpent: number;
  joinedAt: string;
  lastActiveAt: string | null;
}

export interface CustomerAddress {
  id: string;
  label: string;
  line: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export type CustomerOrderStatus = "processing" | "shipped" | "delivered" | "cancelled";

export interface CustomerOrder {
  id: string;
  placedAt: string;
  total: number;
  items: number;
  status: CustomerOrderStatus;
}

export interface CustomerDetail extends Customer {
  addresses: CustomerAddress[];
  recentOrders: CustomerOrder[];
  /** Average order value in rupees (0 without orders). */
  averageOrder: number;
}

export interface CustomerSort {
  key: CustomerSortKey;
  dir: SortDir;
}

export interface CustomerFilters {
  search: string;
  websiteId: string;
  status: CustomerStatus | "all";
  signIn: SignInMethod | "all";
  sort: CustomerSort;
  page: number;
  pageSize: number;
}

export interface CustomerCounts {
  all: number;
  active: number;
  blocked: number;
  unverified: number;
  /** Joined in the 30 days before the server's "today". */
  newLast30Days: number;
}

export type CustomersResponse = Paginated<Customer, { counts: CustomerCounts }>;

export interface CustomerExport {
  filename: string;
  csv: string;
  rows: number;
}
