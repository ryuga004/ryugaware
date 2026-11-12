export type StorageProvider = "s3" | "s3_compatible";

/** not_connected: media goes to Ryugaware storage. failed: saved, but the last check failed (media still falls back). */
export type StorageStatus = "not_connected" | "connected" | "failed";

export type StorageTestStepKey = "bucket" | "write" | "read" | "delete" | "public_url";
export type StorageTestStepStatus = "passed" | "failed" | "skipped";

export interface StorageTestStep {
  key: StorageTestStepKey;
  label: string;
  status: StorageTestStepStatus;
  message: string;
  /** Form field to highlight when this step fails, with a short message for it. */
  field?: "bucket" | "region" | "accessKeyId" | "publicBaseUrl";
  fieldMessage?: string;
}

export interface StorageTestResult {
  ok: boolean;
  testedAt: string;
  bucket: string;
  region: string;
  steps: StorageTestStep[];
  /** True when the saved configuration was tested (the result is stored on it). */
  saved: boolean;
}

export interface StorageUsage {
  bytesUsed: number;
  objects: number;
  lastUploadAt: string | null;
  /** e.g. "Bloom Studio · product image". */
  lastUploadLabel: string | null;
}

/** What GET /storage returns. Secrets are never returned, only a masked hint. */
export interface StorageConfig {
  status: StorageStatus;
  provider: StorageProvider;
  /** S3-compatible services only, e.g. https://<account>.r2.cloudflarestorage.com */
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  /** e.g. "••••••••3f9a", or null when no secret is saved. */
  secretHint: string | null;
  pathPrefix: string;
  publicBaseUrl: string;
  forcePathStyle: boolean;
  connectedAt: string | null;
  updatedAt: string | null;
  lastTest: StorageTestResult | null;
  usage: StorageUsage | null;
  /** Ryugaware's fallback storage allowance in bytes. */
  fallbackQuotaBytes: number;
}

/** Body of PUT /storage and POST /storage/test. An empty secret means "keep the saved one". */
export interface StorageInput {
  provider: StorageProvider;
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  pathPrefix: string;
  publicBaseUrl: string;
  forcePathStyle: boolean;
}

/** Stored document (public/data/storage.json). Holds the raw secret, which never leaves the dummy backend. */
export interface StorageDocument extends Omit<StorageConfig, "secretHint"> {
  secretAccessKey: string | null;
}
