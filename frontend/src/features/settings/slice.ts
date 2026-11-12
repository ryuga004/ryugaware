import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { settingsApi } from "./api";
import type { OrganizationEditable, UpdateOrganizationInput } from "./types";

interface SettingsState {
  /** Unsaved edits only. Displayed value = draft[key] ?? server value, so server data is never duplicated. */
  draft: UpdateOrganizationInput;
  changePasswordOpen: boolean;
  lastSavedAt: string | null;
  sessionCount: number | null;
}

const initialState: SettingsState = { draft: {}, changePasswordOpen: false, lastSavedAt: null, sessionCount: null };

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    /** Records an edit. Passing the server value again removes the key (no longer "dirty"). */
    editField(state, a: PayloadAction<{ key: keyof OrganizationEditable; value: string; serverValue: string }>) {
      const { key, value, serverValue } = a.payload;
      if (value === serverValue) delete state.draft[key];
      else state.draft[key] = value;
    },
    resetDraft(state) {
      state.draft = {};
    },
    openChangePassword(state) {
      state.changePasswordOpen = true;
    },
    closeChangePassword(state) {
      state.changePasswordOpen = false;
    },
  },
  extraReducers: (builder) => {
    const { updateOrganization, getSessions, signOutSession, signOutOtherSessions, changePassword } = settingsApi.endpoints;
    builder
      .addMatcher(updateOrganization.matchFulfilled, (state, { payload }) => {
        state.draft = {};
        state.lastSavedAt = payload.updatedAt;
      })
      .addMatcher(getSessions.matchFulfilled, (state, { payload }) => {
        state.sessionCount = payload.length;
      })
      .addMatcher(signOutSession.matchFulfilled, (state) => {
        if (state.sessionCount) state.sessionCount -= 1;
      })
      .addMatcher(signOutOtherSessions.matchFulfilled, (state) => {
        state.sessionCount = 1;
      })
      .addMatcher(changePassword.matchFulfilled, (state) => {
        state.changePasswordOpen = false;
      });
  },
  selectors: {
    selectDraft: (s) => s.draft,
    selectIsDirty: (s) => Object.keys(s.draft).length > 0,
    selectChangePasswordOpen: (s) => s.changePasswordOpen,
    selectSessionCount: (s) => s.sessionCount,
  },
});

export const { editField, resetDraft, openChangePassword, closeChangePassword } = settingsSlice.actions;
export const { selectDraft, selectIsDirty, selectChangePasswordOpen, selectSessionCount } = settingsSlice.selectors;
export default settingsSlice.reducer;
