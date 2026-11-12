import type { ApiError } from "../types";

/** Thrown by dummy handlers; converted to an RTK Query `error` by the dummy base query. */
export class ApiHttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiHttpError";
  }

  toShape(): ApiError {
    return {
      status: this.status,
      data: { code: this.code, message: this.message, fieldErrors: this.fieldErrors },
    };
  }
}

export const notFound = (what: string) => new ApiHttpError(404, "not_found", `${what} was not found.`);
export const badRequest = (message: string, fieldErrors?: Record<string, string>) =>
  new ApiHttpError(400, "validation_error", message, fieldErrors);
export const conflict = (code: string, message: string, fieldErrors?: Record<string, string>) =>
  new ApiHttpError(409, code, message, fieldErrors);
export const forbidden = (code: string, message: string) => new ApiHttpError(403, code, message);
