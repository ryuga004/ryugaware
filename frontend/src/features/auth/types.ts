export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  organizationName: string;
  emailVerified: boolean;
}

export interface SessionInfo {
  authenticated: boolean;
  user: AuthUser | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  organizationName: string;
  email: string;
  password: string;
}

export type AuthStatus = "unknown" | "authenticated" | "anonymous";

/** Result of validating a one-time link token (email verification / password reset). */
export interface TokenCheck {
  valid: boolean;
}
