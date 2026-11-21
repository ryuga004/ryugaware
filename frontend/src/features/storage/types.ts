/**
 * Storage is platform-managed: one Ryugaware bucket, one key prefix per website, created with the
 * website and reclaimed with it. The customer never configures it, so this screen is read-only.
 */

/** Kept for `features/website-settings`, which still reports a per-website storage badge. */
export type StorageProvider = "platform";
export type StorageStatus = "connected" | "not_connected" | "failed";

export interface WebsiteStorage {
  websiteId: string;
  name: string;
  /** The website's key prefix inside the platform bucket. */
  prefix: string;
  bytes: number;
  objects: number;
}

/** What GET /storage returns. */
export interface Storage {
  provider: StorageProvider;
  websites: WebsiteStorage[];
  bytesUsed: number;
  objects: number;
  /** The licence's storage allowance in bytes. */
  quotaBytes: number;
}
