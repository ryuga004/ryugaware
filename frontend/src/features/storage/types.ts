/**
 * Storage is platform-managed: one Ryugaware bucket, one key prefix per website, created with the
 * website and reclaimed with it. The customer never configures it, so this screen is read-only.
 */

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
  provider: "platform";
  websites: WebsiteStorage[];
  bytesUsed: number;
  objects: number;
  /** The licence's storage allowance in bytes. */
  quotaBytes: number;
}

/** One level of a website's storage prefix, as the browser shows it. */
export interface AssetFolder {
  name: string;
  /** Path relative to the website's prefix, always ending in "/". */
  path: string;
  bytes: number;
  objects: number;
}

export interface AssetFile {
  /** Full object key, including the website's prefix. This is what a delete takes. */
  key: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  updatedAt: string;
}

export interface AssetListing {
  websiteId: string;
  path: string;
  folders: AssetFolder[];
  files: AssetFile[];
  bytes: number;
  objects: number;
  /** More objects exist than one listing returns; the rest cannot be reached from here. */
  truncated: boolean;
}

export interface AssetListArgs {
  websiteId: string;
  path: string;
}
