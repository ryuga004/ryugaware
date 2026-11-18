import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryApi, BaseQueryFn } from "@reduxjs/toolkit/query";
import { API_URL } from "./config";
import type { ApiError, ApiRequest } from "./types";

/** RFC 9457 problem document returned by the Go backend. */
interface ProblemDocument {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: string;
  errors?: { field?: string; pointer?: string; detail?: string }[];
  request_id?: string;
}

/** Normalises a problem document into the flat shape every form in the app already reads. */
function toApiError(status: number, body: unknown): ApiError {
  const problem = (body ?? {}) as ProblemDocument;
  const fieldErrors = problem.errors?.reduce<Record<string, string>>((acc, e) => {
    const field = e.field ?? e.pointer?.replace(/^\//, "");
    if (field && e.detail) acc[field] = e.detail;
    return acc;
  }, {});

  return {
    status,
    data: {
      code: problem.code ?? "request_failed",
      message: problem.detail ?? problem.title ?? "Request failed.",
      fieldErrors: fieldErrors && Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      requestId: problem.request_id,
    },
  };
}

const rawQuery = fetchBaseQuery({ baseUrl: API_URL, credentials: "include" });

/** Endpoints that must never trigger a refresh-and-retry: they define the session themselves. */
const SESSION_ENDPOINTS = ["/auth/sessions", "/auth/tokens/refresh", "/auth/me"];

const urlOf = (args: string | ApiRequest) => (typeof args === "string" ? args : args.url);

/** Shared so N parallel 401s cause one refresh, not N. */
let refreshing: Promise<boolean> | null = null;

async function refreshSession(api: BaseQueryApi, extra: object): Promise<boolean> {
  refreshing ??= (async () => {
    const result = await rawQuery({ url: "/auth/tokens/refresh", method: "POST" }, api, extra);
    return !result.error;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * Real backend adapter. Failures become the shared `ApiError` shape, and a 401 on a normal
 * endpoint is retried once behind a silent token refresh so a short access-token TTL is invisible.
 */
const httpBaseQuery: BaseQueryFn<string | ApiRequest, unknown, ApiError> = async (args, api, extra) => {
  let result = await rawQuery(args as Parameters<typeof rawQuery>[0], api, extra);

  const status = typeof result.error?.status === "number" ? result.error.status : 0;
  if (status === 401 && !SESSION_ENDPOINTS.includes(urlOf(args))) {
    if (await refreshSession(api, extra)) {
      result = await rawQuery(args as Parameters<typeof rawQuery>[0], api, extra);
    }
  }

  if (!result.error) return { data: result.data, meta: result.meta };

  const finalStatus = typeof result.error.status === "number" ? result.error.status : 0;
  return { error: toApiError(finalStatus, (result.error as { data?: unknown }).data) };
};

export const TAG_TYPES = [
  "Auth",
  "Website",
  "WebsiteOptions",
  "Template",
  "Organization",
  "Options",
  "Session",
  "Me",
  "License",
  "Domain",
  "PaymentMethod",
  "Transaction",
  "Revenue",
  "DeliveryMethod",
  "Shipment",
  "Customer",
  "StorageConfig",
  "AuthConfig",
  "ContactDetails",
  "SiteContent",
  "StoreSettings",
] as const;
export type TagType = (typeof TAG_TYPES)[number];

/**
 * The single RTK Query API. Every feature adds its own endpoints with `baseApi.injectEndpoints`
 * (see `features/*\/api.ts`), so no endpoint definitions live in this file.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: httpBaseQuery,
  tagTypes: [...TAG_TYPES],
  keepUnusedDataFor: 120,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
