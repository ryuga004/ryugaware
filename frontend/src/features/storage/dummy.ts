/**
 * Dummy backend routes for Storage (the customer's own S3 bucket for website media).
 *   GET    /storage          current configuration (secret masked)
 *   PUT    /storage          StorageInput: connect / update; runs the connection check and stores the result
 *   POST   /storage/test     { input?: StorageInput }: checks the given values, or the saved config when omitted
 *   DELETE /storage          disconnect: media falls back to Ryugaware storage
 *
 * Simulated failures: a bucket name containing "fail" can’t be written to, one containing "missing" doesn’t exist,
 * and a bucket name that contains another AWS region code (e.g. "shop-media-eu-west-1") is "in" that region.
 */
import { badRequest } from "@/lib/api/dummy/errors";
import { db } from "@/lib/api/dummy/db";
import { isoAgo } from "@/lib/api/dummy/fake";
import { registerRoutes } from "@/lib/api/dummy/router";
import { registerScenario } from "@/lib/api/dummy/scenario";
import { nowIso } from "@/lib/api/dummy/utils";
import { AWS_REGIONS, COMPATIBLE_REGIONS, regionLabel } from "./constants";
import { ACCESS_KEY_PATTERN, bucketNameError, isHttpsUrl, normalisePrefix, normaliseUrl, PREFIX_PATTERN } from "./schemas";
import type { StorageConfig, StorageDocument, StorageInput, StorageTestResult, StorageTestStep } from "./types";

const FILE = "storage";
const doc = () => db.document<StorageDocument>(FILE);

const BLANK: Omit<StorageDocument, "fallbackQuotaBytes"> = {
  status: "not_connected",
  provider: "s3",
  endpoint: "",
  bucket: "",
  region: "",
  accessKeyId: "",
  secretAccessKey: null,
  pathPrefix: "",
  publicBaseUrl: "",
  forcePathStyle: false,
  connectedAt: null,
  updatedAt: null,
  lastTest: null,
  usage: null,
};

const GB = 1024 ** 3;

registerScenario<StorageDocument>(FILE, {
  // Nothing connected: uploads use Ryugaware storage.
  empty: (seed) => ({ ...BLANK, fallbackQuotaBytes: seed.fallbackQuotaBytes }),
  // A bare-bones bucket: no prefix, no CDN, a few hundred files.
  small: (seed) => ({
    ...seed,
    bucket: "bloom-media",
    pathPrefix: "",
    publicBaseUrl: "",
    connectedAt: isoAgo(60 * 24 * 9),
    updatedAt: isoAgo(60 * 24 * 9),
    lastTest: seed.lastTest && {
      ...seed.lastTest,
      bucket: "bloom-media",
      testedAt: isoAgo(60 * 24 * 9),
      steps: seed.lastTest.steps.map((s) =>
        s.key === "bucket"
          ? { ...s, message: "bloom-media found in ap-south-1." }
          : s.key === "write"
            ? { ...s, message: "Uploaded .ryugaware-check.txt." }
            : s.key === "public_url"
              ? { ...s, message: "Files are served from https://bloom-media.s3.ap-south-1.amazonaws.com." }
              : s,
      ),
    },
    usage: { bytesUsed: Math.round(2.3 * GB), objects: 412, lastUploadAt: isoAgo(180), lastUploadLabel: "Lotus Yoga Studio · class photo" },
  }),
  // Cloudflare R2 with long names and a very large bucket.
  large: (seed) => {
    const bucket = "ryugaware-bloom-studio-production-media-assets-all-stores";
    const endpoint = "https://8f2k3j9x4m1a2b3c4d5e6f7a8b9c0d1e.r2.cloudflarestorage.com";
    const at = isoAgo(14);
    return {
      ...seed,
      provider: "s3_compatible",
      endpoint,
      bucket,
      region: "auto",
      accessKeyId: "9c4f2e7a1b3d5f6e8a0c2e4f6a8b0d2e",
      pathPrefix: "ryugaware/production/websites/all-stores/uploads/2026/",
      publicBaseUrl: "https://media-cdn.bloomstudio-retail-group.com",
      forcePathStyle: true,
      lastTest: { ok: true, saved: true, testedAt: at, bucket, region: "auto", steps: checks({ ...toInput(seed), provider: "s3_compatible", endpoint, bucket, region: "auto", publicBaseUrl: "https://media-cdn.bloomstudio-retail-group.com", pathPrefix: "ryugaware/production/websites/all-stores/uploads/2026/", forcePathStyle: true }) },
      usage: { bytesUsed: Math.round(1843.6 * GB), objects: 2_418_977, lastUploadAt: isoAgo(2), lastUploadLabel: "Spice Route Pantry · product gallery (24 images)" },
    };
  },
});

const mask = (secret: string | null) => (secret ? `••••••••${secret.slice(-4)}` : null);

function toConfig(d: StorageDocument): StorageConfig {
  const { secretAccessKey, ...rest } = d;
  return { ...rest, secretHint: mask(secretAccessKey) };
}

function toInput(d: StorageDocument): StorageInput {
  return {
    provider: d.provider,
    endpoint: d.endpoint,
    bucket: d.bucket,
    region: d.region,
    accessKeyId: d.accessKeyId,
    secretAccessKey: d.secretAccessKey ?? "",
    pathPrefix: d.pathPrefix,
    publicBaseUrl: d.publicBaseUrl,
    forcePathStyle: d.forcePathStyle,
  };
}

/** Server-side validation + normalisation. `savedSecret` fills an empty secret field. */
function validate(raw: Partial<StorageInput>, savedSecret: string | null): StorageInput {
  const provider = raw.provider === "s3_compatible" ? "s3_compatible" : "s3";
  const input: StorageInput = {
    provider,
    endpoint: provider === "s3_compatible" ? normaliseUrl(String(raw.endpoint ?? "")) : "",
    bucket: String(raw.bucket ?? "").trim(),
    region: String(raw.region ?? "").trim(),
    accessKeyId: String(raw.accessKeyId ?? "").trim(),
    secretAccessKey: String(raw.secretAccessKey ?? "").trim() || savedSecret || "",
    pathPrefix: String(raw.pathPrefix ?? "").trim(),
    publicBaseUrl: normaliseUrl(String(raw.publicBaseUrl ?? "")),
    forcePathStyle: Boolean(raw.forcePathStyle),
  };
  const fe: Record<string, string> = {};
  const bucketErr = bucketNameError(input.bucket);
  if (bucketErr) fe.bucket = bucketErr;
  const regions = provider === "s3" ? AWS_REGIONS : COMPATIBLE_REGIONS;
  if (!regions.some((r) => r.value === input.region)) fe.region = "Choose a region.";
  if (provider === "s3_compatible" && !isHttpsUrl(input.endpoint)) fe.endpoint = "Enter the https:// endpoint URL from your provider.";
  if (!ACCESS_KEY_PATTERN.test(input.accessKeyId)) fe.accessKeyId = "Enter a valid access key ID.";
  if (!input.secretAccessKey) fe.secretAccessKey = "Enter the secret access key.";
  if (!PREFIX_PATTERN.test(input.pathPrefix)) fe.pathPrefix = "Use letters, numbers, slashes, dots, hyphens and underscores.";
  if (input.publicBaseUrl && !isHttpsUrl(input.publicBaseUrl)) fe.publicBaseUrl = "Use an https:// URL.";
  if (Object.keys(fe).length) throw badRequest("Please fix the highlighted fields.", fe);
  input.pathPrefix = normalisePrefix(input.pathPrefix);
  return input;
}

function bucketUrl(i: StorageInput) {
  if (i.provider === "s3_compatible") return `${i.endpoint}/${i.bucket}`;
  return i.forcePathStyle ? `https://s3.${i.region}.amazonaws.com/${i.bucket}` : `https://${i.bucket}.s3.${i.region}.amazonaws.com`;
}

/** The simulated connection check: bucket → write → read → delete → public URL. Stops at the first failure. */
function checks(i: StorageInput): StorageTestStep[] {
  const where = i.region === "auto" ? "your S3-compatible endpoint" : i.region;
  const object = `${i.pathPrefix}.ryugaware-check.txt`;
  const embeddedRegion = AWS_REGIONS.map((r) => r.value).find((r) => i.bucket.includes(r));
  const planned: Omit<StorageTestStep, "status">[] = [
    { key: "bucket", label: "Bucket reachable", message: `${i.bucket} found in ${where}.` },
    { key: "write", label: "Write a test object", message: `Uploaded ${object}.` },
    { key: "read", label: "Read it back", message: "Read 42 bytes back." },
    { key: "delete", label: "Delete it", message: "Removed the test object." },
    {
      key: "public_url",
      label: "Public URL",
      message: i.publicBaseUrl ? `Loaded the test object from ${i.publicBaseUrl}.` : `Files are served from ${bucketUrl(i)}.`,
    },
  ];
  type Failure = Pick<StorageTestStep, "key" | "message" | "field" | "fieldMessage">;
  let failure: Failure | null = null;
  if (i.bucket.includes("missing"))
    failure = { key: "bucket", message: `No bucket named ${i.bucket} in ${where}. Check the name, or create the bucket first.`, field: "bucket", fieldMessage: "We couldn’t find this bucket." };
  else if (embeddedRegion && i.region !== "auto" && embeddedRegion !== i.region)
    failure = {
      key: "bucket",
      message: `The bucket is in ${embeddedRegion}, not ${i.region}. Choose ${regionLabel(embeddedRegion)} as the region.`,
      field: "region",
      fieldMessage: `The bucket is in ${embeddedRegion}.`,
    };
  else if (i.bucket.includes("fail"))
    failure = {
      key: "write",
      message: "Access denied: the access key can’t write to this bucket. Add s3:PutObject to its policy.",
      field: "accessKeyId",
      fieldMessage: "This key has read-only access.",
    };
  else if (i.publicBaseUrl.includes("private"))
    failure = {
      key: "public_url",
      message: `${i.publicBaseUrl} returned 403 Forbidden. Allow public reads for the bucket or the CDN.`,
      field: "publicBaseUrl",
      fieldMessage: "This URL returned 403 Forbidden.",
    };

  let failed = false;
  return planned.map((s) => {
    if (failed) return { ...s, status: "skipped", message: "Skipped because an earlier check failed." };
    if (failure?.key === s.key) {
      failed = true;
      return { ...s, ...failure, status: "failed" };
    }
    return { ...s, status: "passed" };
  });
}

function runTest(i: StorageInput, saved: boolean): StorageTestResult {
  const steps = checks(i);
  return { ok: steps.every((s) => s.status === "passed"), testedAt: nowIso(), bucket: i.bucket, region: i.region, steps, saved };
}

registerRoutes([
  {
    method: "GET",
    path: "/storage",
    handler: async () => ({ data: toConfig(await doc()) }),
  },
  {
    method: "PUT",
    path: "/storage",
    handler: async ({ body }) => {
      const d = await doc();
      const input = validate((body ?? {}) as Partial<StorageInput>, d.status === "not_connected" ? null : d.secretAccessKey);
      const result = runTest(input, true);
      const sameBucket = d.status !== "not_connected" && d.bucket === input.bucket && d.provider === input.provider;
      const now = nowIso();
      Object.assign(d, {
        ...input,
        status: result.ok ? "connected" : "failed",
        connectedAt: result.ok ? (sameBucket && d.connectedAt ? d.connectedAt : now) : sameBucket ? d.connectedAt : null,
        updatedAt: now,
        lastTest: result,
        usage: sameBucket ? d.usage : result.ok ? { bytesUsed: 0, objects: 0, lastUploadAt: null, lastUploadLabel: null } : null,
      } satisfies Partial<StorageDocument>);
      return { data: toConfig(d) };
    },
  },
  {
    method: "POST",
    path: "/storage/test",
    handler: async ({ body }) => {
      const d = await doc();
      const raw = (body as { input?: Partial<StorageInput> } | undefined)?.input;
      if (!raw) {
        if (d.status === "not_connected") throw badRequest("Connect a bucket first.");
        const result = runTest(toInput(d), true);
        d.lastTest = result;
        d.status = result.ok ? "connected" : "failed";
        if (result.ok) d.connectedAt ??= result.testedAt;
        return { data: result };
      }
      const input = validate(raw, d.status === "not_connected" ? null : d.secretAccessKey);
      return { data: runTest(input, false) };
    },
  },
  {
    method: "DELETE",
    path: "/storage",
    handler: async () => {
      const d = await doc();
      if (d.status === "not_connected") throw badRequest("No bucket is connected.");
      Object.assign(d, BLANK);
      return { data: toConfig(d) };
    },
  },
]);
