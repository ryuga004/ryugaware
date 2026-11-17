/**
 * The only part of a thrown value we ever show: the digest Next generates for errors that
 * crossed the server boundary. It is a hash, so it leaks nothing, and support can match it
 * to the server logs. Anything else (message, stack) stays out of the UI.
 */
export function errorReference(error: unknown): string | undefined {
  if (error instanceof Error && "digest" in error && typeof error.digest === "string") return error.digest;
  return undefined;
}
