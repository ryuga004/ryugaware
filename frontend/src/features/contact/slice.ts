import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { baseApi } from "@/lib/api/baseApi";
import { contactApi } from "./api";
import type { ContactScope } from "./types";

interface ContactState {
  /** "default" or a website id. The details themselves live in the RTK Query cache. */
  scope: ContactScope;
  /** Scope picked while the form had unsaved edits (waiting for "Discard"). */
  pendingScope: ContactScope | null;
  resetOpen: boolean;
  /** Onboarding: "Add contact details" was clicked. */
  setupStarted: boolean;
  /** An inheriting website: "Customize for this website" was clicked. */
  customizing: boolean;
}

const initialState: ContactState = { scope: "default", pendingScope: null, resetOpen: false, setupStarted: false, customizing: false };

const contactSlice = createSlice({
  name: "contact",
  initialState,
  reducers: {
    setContactScope(state, a: PayloadAction<ContactScope>) {
      state.scope = a.payload;
      state.pendingScope = null;
      state.customizing = false;
    },
    requestContactScope(state, a: PayloadAction<ContactScope>) {
      state.pendingScope = a.payload;
    },
    cancelContactScope(state) {
      state.pendingScope = null;
    },
    openResetContact(state) {
      state.resetOpen = true;
    },
    cancelResetContact(state) {
      state.resetOpen = false;
    },
    startContactSetup(state) {
      state.setupStarted = true;
    },
    cancelContactSetup(state) {
      state.setupStarted = false;
    },
    startCustomizing(state) {
      state.customizing = true;
    },
    cancelCustomizing(state) {
      state.customizing = false;
    },
  },
  extraReducers: (builder) => {
    const { saveContactDetails, resetContactDetails } = contactApi.endpoints;
    builder
      .addMatcher(saveContactDetails.matchFulfilled, (state) => {
        state.setupStarted = false;
        state.customizing = false;
      })
      .addMatcher(resetContactDetails.matchFulfilled, (state) => {
        state.resetOpen = false;
      })
      .addMatcher(resetContactDetails.matchRejected, (state) => {
        state.resetOpen = false;
      })
      .addMatcher(baseApi.util.resetApiState.match, () => initialState);
  },
  selectors: {
    selectContactScope: (s) => s.scope,
    selectPendingContactScope: (s) => s.pendingScope,
    selectContactResetOpen: (s) => s.resetOpen,
    selectContactSetupStarted: (s) => s.setupStarted,
    selectContactCustomizing: (s) => s.customizing,
  },
});

export const {
  setContactScope,
  requestContactScope,
  cancelContactScope,
  openResetContact,
  cancelResetContact,
  startContactSetup,
  cancelContactSetup,
  startCustomizing,
  cancelCustomizing,
} = contactSlice.actions;
export const { selectContactScope, selectPendingContactScope, selectContactResetOpen, selectContactSetupStarted, selectContactCustomizing } =
  contactSlice.selectors;

export default contactSlice.reducer;
