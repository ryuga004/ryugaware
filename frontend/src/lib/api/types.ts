/** Shared API contracts. Keep these identical when the dummy layer is replaced by a real backend. */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

/** Argument accepted by every RTK Query endpoint's `query()` builder. */
export interface ApiRequest {
  url: string;
  method?: HttpMethod;
  params?: QueryParams;
  body?: unknown;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** Server clock at the time of the response (ISO 8601). */
  requestedAt: string;
}

export interface Paginated<T, M extends object = object> {
  data: T[];
  meta: PageMeta & M;
}

export interface Single<T> {
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  /** Field-level validation messages keyed by form field name. */
  fieldErrors?: Record<string, string>;
}

/** Shape of `error` returned by the base query (serializable). */
export interface ApiError {
  status: number;
  data: ApiErrorBody;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "data" in value &&
    typeof (value as ApiError).data === "object" &&
    (value as ApiError).data !== null &&
    "message" in (value as ApiError).data
  );
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (isApiError(error)) return error.data.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
