import { z } from "zod";
import type { StorageConfig } from "./types";

/** S3 bucket naming rules. Returns the first broken rule, or null. Shared by the form and the dummy backend. */
export function bucketNameError(name: string): string | null {
  if (!name) return "Enter the bucket name.";
  if (name.length < 3 || name.length > 63) return "Bucket names are 3 to 63 characters long.";
  if (/[A-Z]/.test(name)) return "Use lowercase letters only.";
  if (!/^[a-z0-9.-]+$/.test(name)) return "Use only lowercase letters, numbers, dots and hyphens.";
  if (!/^[a-z0-9].*[a-z0-9]$/.test(name)) return "Start and end with a letter or number.";
  if (name.includes("..")) return "Don’t use two dots in a row.";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(name)) return "Bucket names can’t look like an IP address.";
  if (name.startsWith("xn--") || name.endsWith("-s3alias")) return "That prefix or suffix is reserved by AWS.";
  return null;
}

export const ACCESS_KEY_PATTERN = /^[A-Za-z0-9]{16,128}$/;
export const PREFIX_PATTERN = /^[A-Za-z0-9!_.*'()/-]*$/;

export const isHttpsUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && Boolean(u.hostname.includes("."));
  } catch {
    return false;
  }
};

/** "/media//uploads" -> "media/uploads/" (no leading slash, one trailing slash). */
export const normalisePrefix = (v: string) => {
  const parts = v.trim().split("/").filter(Boolean);
  return parts.length ? `${parts.join("/")}/` : "";
};

export const normaliseUrl = (v: string) => v.trim().replace(/\/+$/, "");

/** `hasSavedSecret`: an empty secret is allowed only when one is already stored. */
export function storageSchema(hasSavedSecret: boolean) {
  return z
    .object({
      provider: z.enum(["s3", "s3_compatible"]),
      endpoint: z.string().trim(),
      bucket: z.string().trim(),
      region: z.string().min(1, "Choose a region."),
      accessKeyId: z.string().trim(),
      secretAccessKey: z.string().trim(),
      pathPrefix: z.string().trim(),
      publicBaseUrl: z.string().trim(),
      forcePathStyle: z.boolean(),
    })
    .superRefine((v, ctx) => {
      const bucket = bucketNameError(v.bucket);
      if (bucket) ctx.addIssue({ code: "custom", path: ["bucket"], message: bucket });
      if (v.provider === "s3_compatible") {
        if (!v.endpoint) ctx.addIssue({ code: "custom", path: ["endpoint"], message: "Enter the endpoint URL from your provider." });
        else if (!isHttpsUrl(v.endpoint)) ctx.addIssue({ code: "custom", path: ["endpoint"], message: "Use an https:// URL, e.g. https://<account>.r2.cloudflarestorage.com." });
      }
      if (v.provider === "s3" && v.region === "auto") ctx.addIssue({ code: "custom", path: ["region"], message: "Choose an AWS region." });
      if (!v.accessKeyId) ctx.addIssue({ code: "custom", path: ["accessKeyId"], message: "Enter the access key ID." });
      else if (!ACCESS_KEY_PATTERN.test(v.accessKeyId)) ctx.addIssue({ code: "custom", path: ["accessKeyId"], message: "Access key IDs are 16+ letters and numbers, e.g. AKIA…" });
      if (!v.secretAccessKey && !hasSavedSecret) ctx.addIssue({ code: "custom", path: ["secretAccessKey"], message: "Enter the secret access key." });
      else if (v.secretAccessKey && v.secretAccessKey.length < 20) ctx.addIssue({ code: "custom", path: ["secretAccessKey"], message: "That key looks too short. Paste the full secret." });
      if (v.pathPrefix && !PREFIX_PATTERN.test(v.pathPrefix)) ctx.addIssue({ code: "custom", path: ["pathPrefix"], message: "Use letters, numbers, slashes, dots, hyphens and underscores." });
      if (v.publicBaseUrl && !isHttpsUrl(v.publicBaseUrl)) ctx.addIssue({ code: "custom", path: ["publicBaseUrl"], message: "Use an https:// URL, e.g. https://cdn.example.com." });
    })
    .transform((v) => ({
      ...v,
      endpoint: v.provider === "s3_compatible" ? normaliseUrl(v.endpoint) : "",
      pathPrefix: normalisePrefix(v.pathPrefix),
      publicBaseUrl: normaliseUrl(v.publicBaseUrl),
    }));
}

export type StorageValues = z.input<ReturnType<typeof storageSchema>>;
export type StorageOutput = z.output<ReturnType<typeof storageSchema>>;

export const STORAGE_FIELDS = ["provider", "endpoint", "bucket", "region", "accessKeyId", "secretAccessKey", "pathPrefix", "publicBaseUrl", "forcePathStyle"] as const;

export const EMPTY_STORAGE_VALUES: StorageValues = {
  provider: "s3",
  endpoint: "",
  bucket: "",
  region: "ap-south-1",
  accessKeyId: "",
  secretAccessKey: "",
  pathPrefix: "",
  publicBaseUrl: "",
  forcePathStyle: false,
};

/** Form values for a saved configuration (the secret field always starts empty). */
export function toStorageValues(c: StorageConfig): StorageValues {
  if (c.status === "not_connected") return EMPTY_STORAGE_VALUES;
  return {
    provider: c.provider,
    endpoint: c.endpoint,
    bucket: c.bucket,
    region: c.region,
    accessKeyId: c.accessKeyId,
    secretAccessKey: "",
    pathPrefix: c.pathPrefix,
    publicBaseUrl: c.publicBaseUrl,
    forcePathStyle: c.forcePathStyle,
  };
}
