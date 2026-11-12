import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import { DUMMY_LATENCY_MS } from "../config";
import type { ApiError, ApiRequest, HttpMethod } from "../types";
import { ApiHttpError } from "./errors";
import { matchRoute } from "./router";
import { delay, randomBetween } from "./utils";

// Register every module's dummy routes (side-effect imports).
import "@/features/auth/dummy";
import "@/features/websites/dummy";
import "@/features/templates/dummy";
import "@/features/settings/dummy";
import "@/features/account/dummy";
import "@/features/domains/dummy";
import "@/features/payments/dummy";
import "@/features/delivery/dummy";
import "@/features/customers/dummy";
import "@/features/storage/dummy";
import "@/features/customer-auth/dummy";
import "@/features/contact/dummy";

/**
 * RTK Query base query that answers from the in-memory dummy backend instead of the network.
 * It has the same signature as `fetchBaseQuery`, so swapping it out is a one-line change in `baseApi.ts`.
 */
export const dummyBaseQuery: BaseQueryFn<string | ApiRequest, unknown, ApiError> = async (args) => {
  const req: ApiRequest = typeof args === "string" ? { url: args } : args;
  const method = (req.method ?? "GET").toUpperCase() as HttpMethod;

  await delay(randomBetween(DUMMY_LATENCY_MS));

  try {
    const match = matchRoute(method, req.url);
    if (!match) throw new ApiHttpError(404, "route_not_found", `No dummy route for ${method} ${req.url}`);
    const data = await match.route.handler({ params: match.params, query: req.params ?? {}, body: req.body });
    // A real backend returns copies. RTK Query freezes whatever it caches, so handing out the live in-memory
    // records would make them read-only for later mutations; clone at the boundary instead.
    return { data: structuredClone(data) };
  } catch (e) {
    if (e instanceof ApiHttpError) return { error: e.toShape() };
    return {
      error: {
        status: 500,
        data: { code: "internal_error", message: e instanceof Error ? e.message : "Unexpected error" },
      },
    };
  }
};
