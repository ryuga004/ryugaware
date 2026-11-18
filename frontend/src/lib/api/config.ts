/**
 * API configuration.
 *
 * Every request goes to the Go backend. Point NEXT_PUBLIC_API_URL at it; the default
 * matches the local stack started by `backend/compose.yaml` plus `go run ./cmd/api`.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "ryugaware.com";
