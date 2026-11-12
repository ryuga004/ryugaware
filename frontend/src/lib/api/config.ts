/**
 * API configuration.
 *
 * Set NEXT_PUBLIC_USE_DUMMY_API=false and NEXT_PUBLIC_API_URL to talk to a real backend.
 * Nothing else in the app needs to change: endpoints keep the same request/response contracts.
 */
export const USE_DUMMY_API = process.env.NEXT_PUBLIC_USE_DUMMY_API !== "false";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/** Artificial latency range for the dummy API (milliseconds). */
export const DUMMY_LATENCY_MS: [number, number] = [
  Number(process.env.NEXT_PUBLIC_DUMMY_LATENCY_MIN ?? 250),
  Number(process.env.NEXT_PUBLIC_DUMMY_LATENCY_MAX ?? 600),
];

export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "ryugaware.com";
