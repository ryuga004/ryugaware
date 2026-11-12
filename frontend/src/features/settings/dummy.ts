/**
 * Dummy backend routes for the Settings module.
 *   GET    /organization
 *   PATCH  /organization
 *   GET    /settings/options
 *   GET    /sessions
 *   DELETE /sessions/:id
 *   DELETE /sessions            (sign out all other sessions)
 *   POST   /account/password
 */
import { db } from "@/lib/api/dummy/db";
import { badRequest, notFound } from "@/lib/api/dummy/errors";
import { registerRoutes } from "@/lib/api/dummy/router";
import { nowIso } from "@/lib/api/dummy/utils";
import type { User } from "@/features/account/types";
import type { ChangePasswordInput, Organization, SettingsOptions, Session, UpdateOrganizationInput } from "./types";

const DEMO_PASSWORD = "Password1!";

registerRoutes([
  { method: "GET", path: "/organization", handler: async () => ({ data: await db.document<Organization>("organization") }) },
  {
    method: "PATCH",
    path: "/organization",
    handler: async ({ body }) => {
      const input = body as UpdateOrganizationInput;
      const org = await db.document<Organization>("organization");
      const options = await db.document<SettingsOptions>("settings-options");
      const fieldErrors: Record<string, string> = {};
      if (input.name !== undefined) {
        const name = input.name.trim();
        if (!name) fieldErrors.name = "Enter an organization name.";
        else if (name.length > 80) fieldErrors.name = "Use 80 characters or fewer.";
      }
      if (input.defaultLanguage && !options.languages.some((o) => o.value === input.defaultLanguage)) fieldErrors.defaultLanguage = "Unsupported language.";
      if (input.defaultTimezone && !options.timezones.some((o) => o.value === input.defaultTimezone)) fieldErrors.defaultTimezone = "Unsupported time zone.";
      if (input.defaultCurrency && !options.currencies.some((o) => o.value === input.defaultCurrency)) fieldErrors.defaultCurrency = "Unsupported currency.";
      if (Object.keys(fieldErrors).length) throw badRequest("Please fix the highlighted fields.", fieldErrors);

      Object.assign(org, { ...input, ...(input.name !== undefined ? { name: input.name.trim() } : {}), updatedAt: nowIso() });
      return { data: org };
    },
  },
  { method: "GET", path: "/settings/options", handler: async () => ({ data: await db.document<SettingsOptions>("settings-options") }) },
  {
    method: "GET",
    path: "/sessions",
    handler: async () => {
      const data = await db.collection<Session>("sessions");
      return { data, meta: { total: data.length } };
    },
  },
  {
    method: "DELETE",
    path: "/sessions/:id",
    handler: async ({ params }) => {
      const sessions = await db.collection<Session>("sessions");
      const i = sessions.findIndex((s) => s.id === params.id);
      if (i < 0) throw notFound("Session");
      if (sessions[i].current) throw badRequest("You can’t sign out of this device from here.");
      const [removed] = sessions.splice(i, 1);
      return { data: { id: removed.id, device: removed.device } };
    },
  },
  {
    method: "DELETE",
    path: "/sessions",
    handler: async () => {
      const sessions = await db.collection<Session>("sessions");
      const keep = sessions.filter((s) => s.current);
      const removed = sessions.length - keep.length;
      sessions.splice(0, sessions.length, ...keep);
      return { data: { removed } };
    },
  },
  {
    method: "POST",
    path: "/account/password",
    handler: async ({ body }) => {
      const input = body as ChangePasswordInput;
      if (input.currentPassword !== DEMO_PASSWORD) {
        throw badRequest("Your current password is incorrect.", { currentPassword: `Incorrect password (demo password is "${DEMO_PASSWORD}").` });
      }
      const user = await db.document<User>("user");
      user.passwordChangedAt = nowIso();
      let signedOut = 0;
      if (input.signOutOthers) {
        const sessions = await db.collection<Session>("sessions");
        const keep = sessions.filter((s) => s.current);
        signedOut = sessions.length - keep.length;
        sessions.splice(0, sessions.length, ...keep);
      }
      return { data: { passwordChangedAt: user.passwordChangedAt, signedOutSessions: signedOut } };
    },
  },
]);
