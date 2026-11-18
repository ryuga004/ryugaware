export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  orgName: string;
  tenantId: string;
  role: string;
  privileges: string[];
}

export interface SessionInfo {
  authenticated: boolean;
  user: AuthUser | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Details collected on the register screen, held until the email is verified. */
export interface PendingRegistration {
  orgName: string;
  fullName: string;
  email: string;
  password: string;
}

export interface RegisterInput extends PendingRegistration {
  registrationToken: string;
}

export type AuthStatus = "unknown" | "authenticated" | "anonymous";

/** Result of validating a password-reset token. */
export interface TokenCheck {
  valid: boolean;
}
