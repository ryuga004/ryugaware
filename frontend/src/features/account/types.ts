export interface User {
  id: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  role: "owner" | "admin" | "member";
  organizationId: string;
  organizationName: string;
  createdAt: string;
  passwordChangedAt: string;
}

export interface UpdateMeInput {
  fullName: string;
}

export interface License {
  plan: string;
  status: "active" | "expired" | "suspended";
  allowance: number;
  used: number;
  remaining: number;
  limitReached: boolean;
  validUntil: string | null;
}
