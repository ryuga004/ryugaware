import type { BadgeTone } from "@/components/ui/Badge";
import type { UserRole } from "./types";

/** `roles.type` is sent verbatim by /auth/me; these are its display labels. */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Owner",
  admin: "Admin",
  member: "Member",
  custom: "Custom",
};

export const roleLabel = (role: UserRole) => ROLE_LABELS[role] ?? "Member";

/** The owner of the organization is the one role worth setting apart; the rest stay neutral. */
const ROLE_TONES: Record<UserRole, BadgeTone> = {
  super_admin: "ember",
  admin: "neutral",
  member: "neutral",
  custom: "neutral",
};

export const roleTone = (role: UserRole): BadgeTone => ROLE_TONES[role] ?? "neutral";
