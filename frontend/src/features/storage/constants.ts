import type { SelectOption } from "@/components/ui/Select";
import type { StorageProvider } from "./types";

export const AWS_REGIONS: SelectOption[] = [
  { value: "ap-south-1", label: "Asia Pacific (Mumbai) · ap-south-1" },
  { value: "ap-south-2", label: "Asia Pacific (Hyderabad) · ap-south-2" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore) · ap-southeast-1" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney) · ap-southeast-2" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo) · ap-northeast-1" },
  { value: "me-central-1", label: "Middle East (UAE) · me-central-1" },
  { value: "eu-west-1", label: "Europe (Ireland) · eu-west-1" },
  { value: "eu-west-2", label: "Europe (London) · eu-west-2" },
  { value: "eu-central-1", label: "Europe (Frankfurt) · eu-central-1" },
  { value: "us-east-1", label: "US East (N. Virginia) · us-east-1" },
  { value: "us-east-2", label: "US East (Ohio) · us-east-2" },
  { value: "us-west-2", label: "US West (Oregon) · us-west-2" },
];

/** S3-compatible services also accept "auto" (Cloudflare R2). */
export const COMPATIBLE_REGIONS: SelectOption[] = [{ value: "auto", label: "Automatic · auto (Cloudflare R2)" }, ...AWS_REGIONS];

export const regionOptions = (provider: StorageProvider) => (provider === "s3" ? AWS_REGIONS : COMPATIBLE_REGIONS);

export const regionLabel = (region: string) => COMPATIBLE_REGIONS.find((r) => r.value === region)?.label.split(" · ")[0] ?? region;

export const PROVIDER_OPTIONS: { value: StorageProvider; label: string }[] = [
  { value: "s3", label: "Amazon S3" },
  { value: "s3_compatible", label: "S3-compatible" },
];

export const PROVIDER_LABEL: Record<StorageProvider, string> = { s3: "Amazon S3", s3_compatible: "S3-compatible" };

/** Ryugaware's own storage, used until a bucket is connected. */
export const FALLBACK_QUOTA_LABEL = "5 GB";
