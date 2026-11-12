/**
 * Dummy backend routes for the signed-in account (profile + license).
 *   GET   /me
 *   PATCH /me
 *   GET   /license
 */
import { db } from "@/lib/api/dummy/db";
import { badRequest } from "@/lib/api/dummy/errors";
import { registerRoutes } from "@/lib/api/dummy/router";
import { sessionUserRecord } from "@/features/auth/dummy";
import type { Website } from "@/features/websites/types";
import type { License, UpdateMeInput, User } from "./types";

/** Profile of whoever is signed in. The seeded demo account has a richer profile document; others are derived. */
async function currentUser(): Promise<{ user: User; derived: boolean }> {
  const doc = await db.document<User>("user");
  const session = await sessionUserRecord();
  if (!session || session.email === doc.email) return { user: doc, derived: false };
  return {
    derived: true,
    user: {
      id: session.id,
      fullName: session.fullName,
      email: session.email,
      emailVerified: session.emailVerified,
      role: "owner",
      organizationId: "org_" + session.id.slice(4),
      organizationName: session.organizationName,
      createdAt: session.createdAt,
      passwordChangedAt: session.createdAt,
    },
  };
}

registerRoutes([
  { method: "GET", path: "/me", handler: async () => ({ data: (await currentUser()).user }) },
  {
    method: "PATCH",
    path: "/me",
    handler: async ({ body }) => {
      const input = body as UpdateMeInput;
      const name = input.fullName?.trim() ?? "";
      if (!name) throw badRequest("Enter your full name.", { fullName: "Enter your full name." });
      if (name.length > 80) throw badRequest("Name is too long.", { fullName: "Use 80 characters or fewer." });
      const { user, derived } = await currentUser();
      if (derived) {
        const record = await sessionUserRecord();
        if (record) record.fullName = name;
      } else {
        user.fullName = name;
      }
      return { data: { ...user, fullName: name } };
    },
  },
  {
    method: "GET",
    path: "/license",
    handler: async (): Promise<{ data: License }> => {
      const raw = await db.document<Pick<License, "plan" | "status" | "validUntil"> & { allowance: number }>("license");
      const used = (await db.collection<Website>("websites")).length;
      return {
        data: {
          ...raw,
          used,
          remaining: Math.max(0, raw.allowance - used),
          limitReached: used >= raw.allowance,
        },
      };
    },
  },
]);
