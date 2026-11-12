import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthStatus } from "./types";

interface AuthState {
  /** Quick-read mirror of the session query so any component can branch without subscribing to it. */
  status: AuthStatus;
  /** Email the user is currently verifying / resetting, carried between auth screens. */
  pendingEmail: string | null;
  /** Epoch ms until which "Resend" is disabled. */
  cooldownUntil: number | null;
}

const initialState: AuthState = { status: "unknown", pendingEmail: null, cooldownUntil: null };

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
  },
});

export const { setPendingEmail, startResendCooldown, setAuthStatus, loggedOut } = authSlice.actions;
export const { selectAuthStatus, selectPendingEmail, selectCooldownUntil } = authSlice.selectors;
export default authSlice.reducer;
