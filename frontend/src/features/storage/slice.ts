import { createSlice } from "@reduxjs/toolkit";
import { baseApi } from "@/lib/api/baseApi";
import { storageApi } from "./api";
import type { StorageTestResult } from "./types";

interface StorageState {
  /** Onboarding: the customer clicked "Connect bucket" and sees the form. The config itself lives in the RTK Query cache. */
  setupOpen: boolean;
  disconnectOpen: boolean;
  /** Result of the last "Test connection" run in this session. */
  lastTest: StorageTestResult | null;
}

const initialState: StorageState = { setupOpen: false, disconnectOpen: false, lastTest: null };

const storageSlice = createSlice({
  name: "storage",
  initialState,
  reducers: {
    openStorageSetup(state) {
      state.setupOpen = true;
    },
    closeStorageSetup(state) {
      state.setupOpen = false;
      state.lastTest = null;
    },
    requestDisconnectStorage(state) {
      state.disconnectOpen = true;
    },
    cancelDisconnectStorage(state) {
      state.disconnectOpen = false;
    },
    dismissStorageTest(state) {
      state.lastTest = null;
    },
  },
  extraReducers: (builder) => {
    const { testStorageConnection, saveStorageConfig, disconnectStorage } = storageApi.endpoints;
    builder
      .addMatcher(testStorageConnection.matchFulfilled, (state, { payload }) => {
        state.lastTest = payload;
      })
      .addMatcher(saveStorageConfig.matchFulfilled, (state) => {
        // The saved config carries its own check result.
        state.setupOpen = false;
        state.lastTest = null;
      })
      .addMatcher(disconnectStorage.matchFulfilled, () => initialState)
      .addMatcher(disconnectStorage.matchRejected, (state) => {
        state.disconnectOpen = false;
      })
      // Demo-data switch: start over.
      .addMatcher(baseApi.util.resetApiState.match, () => initialState);
  },
  selectors: {
    selectStorageSetupOpen: (s) => s.setupOpen,
    selectStorageDisconnectOpen: (s) => s.disconnectOpen,
    selectStorageLastTest: (s) => s.lastTest,
  },
});

export const { openStorageSetup, closeStorageSetup, requestDisconnectStorage, cancelDisconnectStorage, dismissStorageTest } = storageSlice.actions;
export const { selectStorageSetupOpen, selectStorageDisconnectOpen, selectStorageLastTest } = storageSlice.selectors;

export default storageSlice.reducer;
