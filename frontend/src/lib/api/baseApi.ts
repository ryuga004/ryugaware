import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import { API_URL, USE_DUMMY_API } from "./config";
import { dummyBaseQuery } from "./dummy/baseQuery";
import type { ApiError, ApiRequest } from "./types";

/**
 * Real backend adapter: same arguments as the dummy query. `fetchBaseQuery` already understands
 * `{ url, method, params, body }`, and we normalise failures into the shared `ApiError` shape.
 */
const httpBaseQuery: BaseQueryFn<string | ApiRequest, unknown, ApiError> = async (args, api, extra) => {
  const raw = fetchBaseQuery({ baseUrl: API_URL, credentials: "include" });
  const result = await raw(args as Parameters<typeof raw>[0], api, extra);
  if (!result.error) return { data: result.data, meta: result.meta };
  const status = typeof result.error.status === "number" ? result.error.status : 0;
  const body = (result.error as { data?: Partial<ApiError["data"]> }).data;
  return {
    error: {
      status,
      data: { code: body?.code ?? "request_failed", message: body?.message ?? "Request failed.", fieldErrors: body?.fieldErrors },
    },
  };
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
] as const;
export type TagType = (typeof TAG_TYPES)[number];

/**
 * The single RTK Query API. Every feature adds its own endpoints with `baseApi.injectEndpoints`
 * (see `features/*\/api.ts`), so no endpoint definitions live in this file.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: USE_DUMMY_API ? dummyBaseQuery : httpBaseQuery,
  tagTypes: [...TAG_TYPES],
  keepUnusedDataFor: 120,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
