import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthStatus, PendingRegistration } from "./types";

interface AuthState {
  /** Quick-read mirror of the session query so any component can branch without subscribing to it. */
  status: AuthStatus;
  /** Email the user is currently verifying / resetting, carried between auth screens. */
  pendingEmail: string | null;
  /** Epoch ms until which "Resend" is disabled. */
  cooldownUntil: number | null;
  /**
   * Registration details waiting on email verification. Memory only: a reload sends the
   * user back to the register screen rather than persisting a password anywhere.
   */
  pendingRegistration: PendingRegistration | null;
}

const initialState: AuthState = { status: "unknown", pendingEmail: null, cooldownUntil: null, pendingRegistration: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setPendingEmail(state, a: PayloadAction<string | null>) {
      state.pendingEmail = a.payload;
    },
    startResendCooldown(state, a: PayloadAction<number>) {
      state.cooldownUntil = a.payload;
    },
    setPendingRegistration(state, a: PayloadAction<PendingRegistration | null>) {
      state.pendingRegistration = a.payload;
      state.pendingEmail = a.payload?.email ?? state.pendingEmail;
    },
    clearPendingRegistration(state) {
      state.pendingRegistration = null;
    },
    setAuthStatus(state, a: PayloadAction<AuthStatus>) {
      state.status = a.payload;
    },
    /** Dispatched after logout; the root reducer resets all slices when it sees this action. */
    loggedOut() {
      /* handled by the root reducer */
    },
  },
  selectors: {
    selectAuthStatus: (s) => s.status,
    selectPendingEmail: (s) => s.pendingEmail,
    selectCooldownUntil: (s) => s.cooldownUntil,
    selectPendingRegistration: (s) => s.pendingRegistration,
  },
});

export const { setPendingEmail, startResendCooldown, setPendingRegistration, clearPendingRegistration, setAuthStatus, loggedOut } = authSlice.actions;
export const { selectAuthStatus, selectPendingEmail, selectCooldownUntil, selectPendingRegistration } = authSlice.selectors;
export default authSlice.reducer;
