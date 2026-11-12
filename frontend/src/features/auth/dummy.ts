/**
 * Dummy backend routes for authentication.
 *   GET  /auth/session
 *   POST /auth/login                    { email, password }
 *   POST /auth/logout
 *   POST /auth/register                 { fullName, organizationName, email, password }
 *   POST /auth/resend-verification      { email }
 *   POST /auth/verify-email             { token, email? }
 *   POST /auth/forgot-password          { email }
 *   GET  /auth/reset-password/validate?token=
 *   POST /auth/reset-password           { token, password }
 *
 * Demo accounts live in public/data/auth-users.json. Demo link tokens:
 *   "valid-token" works, "expired-token" is expired, anything else is invalid.
 */
import { db } from "@/lib/api/dummy/db";
import { ApiHttpError, badRequest, conflict } from "@/lib/api/dummy/errors";
import { registerRoutes } from "@/lib/api/dummy/router";
import { getSessionEmail, setSessionEmail } from "@/lib/api/dummy/session";
import { newId, nowIso, str } from "@/lib/api/dummy/utils";
import type { AuthUser, LoginInput, RegisterInput, SessionInfo } from "./types";

interface UserRecord extends AuthUser {
  password: string;
  createdAt: string;
}

const MAX_ATTEMPTS = 5;
const attempts = new Map<string, number>();
const users = () => db.collection<UserRecord>("auth-users");
const publicUser = ({ id, email, fullName, organizationName, emailVerified }: UserRecord): AuthUser => ({ id, email, fullName, organizationName, emailVerified });
const normalise = (e: unknown) => String(e ?? "").trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Signed-in user record, or null. Shared with the account module so `/me` reflects who is logged in. */
export async function sessionUserRecord(): Promise<UserRecord | null> {
  const email = getSessionEmail();
  if (!email) return null;
  return (await users()).find((u) => u.email === email) ?? null;
}

function tokenState(token: string): "valid" | "expired" | "invalid" {
  if (token === "valid-token") return "valid";
  if (token === "expired-token") return "expired";
  return "invalid";
}

registerRoutes([
  {
    method: "GET",
    path: "/auth/session",
    handler: async (): Promise<{ data: SessionInfo }> => {
      const user = await sessionUserRecord();
      return { data: user ? { authenticated: true, user: publicUser(user) } : { authenticated: false, user: null } };
    },
  },
  {
    method: "POST",
    path: "/auth/login",
    handler: async ({ body }) => {
      const { email: raw, password } = body as LoginInput;
      const email = normalise(raw);
      if ((attempts.get(email) ?? 0) >= MAX_ATTEMPTS) {
        throw new ApiHttpError(429, "too_many_attempts", "Too many attempts. Try again in 5 minutes.");
      }
      const user = (await users()).find((u) => u.email === email);
      if (!user || user.password !== password) {
        attempts.set(email, (attempts.get(email) ?? 0) + 1);
        throw new ApiHttpError(401, "invalid_credentials", "Incorrect email or password. Try again or reset your password.");
      }
      if (!user.emailVerified) throw new ApiHttpError(403, "email_not_verified", "Verify your email to continue.");
      attempts.delete(email);
      setSessionEmail(user.email);
      return { data: { user: publicUser(user) } };
    },
  },
  {
    method: "POST",
    path: "/auth/logout",
    handler: async () => {
      setSessionEmail(null);
      return { data: { loggedOut: true } };
    },
  },
  {
    method: "POST",
    path: "/auth/register",
    handler: async ({ body }) => {
      const input = body as RegisterInput;
      const email = normalise(input.email);
      const fieldErrors: Record<string, string> = {};
      if (!input.fullName?.trim()) fieldErrors.fullName = "Enter your full name.";
      if (!input.organizationName?.trim()) fieldErrors.organizationName = "Enter your organization name.";
      if (!EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email address.";
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(input.password ?? "")) fieldErrors.password = "Use 8+ characters with a letter and a number.";
      if (Object.keys(fieldErrors).length) throw badRequest("Please fix the highlighted fields.", fieldErrors);

      const all = await users();
      if (all.some((u) => u.email === email)) {
        throw conflict("email_taken", "An account with this email already exists.", { email: "An account with this email already exists." });
      }
      const record: UserRecord = {
        id: newId("usr"),
        email,
        password: input.password,
        fullName: input.fullName.trim(),
        organizationName: input.organizationName.trim(),
        emailVerified: false,
        createdAt: nowIso(),
      };
      all.push(record);
      return { data: { email } };
    },
  },
  {
    method: "POST",
    path: "/auth/resend-verification",
    handler: async ({ body }) => {
      // Always succeeds so account existence is never revealed.
      void normalise((body as { email?: string }).email);
      return { data: { sent: true } };
    },
  },
  {
    method: "POST",
    path: "/auth/verify-email",
    handler: async ({ body }) => {
      const { token, email } = body as { token: string; email?: string };
      const state = tokenState(token);
      if (state === "expired") throw new ApiHttpError(410, "link_expired", "This link has expired.");
      if (state === "invalid") throw new ApiHttpError(400, "link_invalid", "This link is not valid.");
      const all = await users();
      const target = (email ? all.find((u) => u.email === normalise(email)) : undefined) ?? [...all].reverse().find((u) => !u.emailVerified);
      if (target) target.emailVerified = true;
      return { data: { verified: true, email: target?.email ?? null } };
    },
  },
  {
    method: "POST",
    path: "/auth/forgot-password",
    handler: async ({ body }) => {
      const email = normalise((body as { email?: string }).email);
      if (!EMAIL_RE.test(email)) throw badRequest("Enter a valid email address.", { email: "Enter a valid email address." });
      return { data: { sent: true } }; // identical response for known and unknown addresses
    },
  },
  {
    method: "GET",
    path: "/auth/reset-password/validate",
    handler: async ({ query }) => {
      const state = tokenState(str(query, "token"));
      return { data: { valid: state === "valid" } };
    },
  },
  {
    method: "POST",
    path: "/auth/reset-password",
    handler: async ({ body }) => {
      const { token, password } = body as { token: string; password: string };
      const state = tokenState(token);
      if (state !== "valid") throw new ApiHttpError(state === "expired" ? 410 : 400, state === "expired" ? "link_expired" : "link_invalid", "This reset link is no longer valid.");
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password ?? "")) throw badRequest("Use 8+ characters with a letter and a number.", { password: "Use 8+ characters with a letter and a number." });
      const target = (await users()).find((u) => u.email === "priya@bloomstudio.com");
      if (target) {
        target.password = password;
        attempts.delete(target.email);
      }
      return { data: { reset: true } };
    },
  },
]);
