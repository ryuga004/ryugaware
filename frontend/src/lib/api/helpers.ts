import { pushToast } from "@/features/ui/slice";
import { getErrorMessage, isApiError, type Single } from "./types";

/** `transformResponse` for `{ data: T }` envelopes. */
export const unwrap = <T,>(res: Single<T>) => res.data;

/**
 * For `onQueryStarted` catch blocks: shows an error toast unless the failure carries field errors
 * (the form shows those inline). Accepts the rejected `queryFulfilled` value or an ApiError.
 */
export function reportError(dispatch: (a: ReturnType<typeof pushToast>) => unknown, rejected: unknown, title: string) {
  const error = rejected && typeof rejected === "object" && "error" in rejected ? (rejected as { error: unknown }).error : rejected;
  if (isApiError(error) && error.data.fieldErrors) return;
  dispatch(pushToast({ tone: "error", title, description: getErrorMessage(error) }));
}

/** Copies server field errors into react-hook-form (only for fields the form has). */
export function applyFieldErrors<F extends string>(error: unknown, fields: readonly F[], setError: (field: F, e: { message: string }) => void) {
  if (!isApiError(error) || !error.data.fieldErrors) return false;
  let applied = false;
  for (const [field, message] of Object.entries(error.data.fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as F, { message });
      applied = true;
    }
  }
  return applied;
}
