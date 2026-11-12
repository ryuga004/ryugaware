import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { baseApi } from "@/lib/api/baseApi";
import { customerAuthApi } from "./api";
import type { AuthScope, GoogleTestResult } from "./types";

interface CustomerAuthState {
  /** "default" or a website id. The settings themselves live in the RTK Query cache. */
  scope: AuthScope;
  /** Scope the customer picked while the form had unsaved edits (waiting for "Discard"). */
  pendingScope: AuthScope | null;
  resetOpen: boolean;
  /** Onboarding: "Set up sign-in" was clicked. */
  setupStarted: boolean;
  googleTest: GoogleTestResult | null;
}

const initialState: CustomerAuthState = { scope: "default", pendingScope: null, resetOpen: false, setupStarted: false, googleTest: null };

const customerAuthSlice = createSlice({
  name: "customerAuth",
  initialState,
  reducers: {
    setAuthScope(state, a: PayloadAction<AuthScope>) {
      state.scope = a.payload;
      state.pendingScope = null;
      state.googleTest = null;
    },
    requestAuthScope(state, a: PayloadAction<AuthScope>) {
      state.pendingScope = a.payload;
    },
    cancelAuthScope(state) {
      state.pendingScope = null;
    },
    openResetAuth(state) {
      state.resetOpen = true;
    },
    cancelResetAuth(state) {
      state.resetOpen = false;
    },
    startAuthSetup(state) {
      state.setupStarted = true;
    },
    cancelAuthSetup(state) {
      state.setupStarted = false;
      state.googleTest = null;
    },
    clearGoogleTest(state) {
      state.googleTest = null;
    },
  },
  extraReducers: (builder) => {
    const { saveCustomerAuth, resetCustomerAuth, testGoogleSignIn } = customerAuthApi.endpoints;
    builder
      .addMatcher(saveCustomerAuth.matchFulfilled, (state) => {
        state.setupStarted = false;
      })
      .addMatcher(resetCustomerAuth.matchFulfilled, (state) => {
        state.resetOpen = false;
        state.googleTest = null;
      })
      .addMatcher(resetCustomerAuth.matchRejected, (state) => {
        state.resetOpen = false;
      })
      .addMatcher(testGoogleSignIn.matchFulfilled, (state, { payload }) => {
        state.googleTest = payload;
      })
      .addMatcher(baseApi.util.resetApiState.match, () => initialState);
  },
  selectors: {
    selectAuthScope: (s) => s.scope,
    selectPendingAuthScope: (s) => s.pendingScope,
    selectAuthResetOpen: (s) => s.resetOpen,
    selectAuthSetupStarted: (s) => s.setupStarted,
    selectGoogleTest: (s) => s.googleTest,
  },
});

export const { setAuthScope, requestAuthScope, cancelAuthScope, openResetAuth, cancelResetAuth, startAuthSetup, cancelAuthSetup, clearGoogleTest } =
  customerAuthSlice.actions;
export const { selectAuthScope, selectPendingAuthScope, selectAuthResetOpen, selectAuthSetupStarted, selectGoogleTest } = customerAuthSlice.selectors;

export default customerAuthSlice.reducer;
