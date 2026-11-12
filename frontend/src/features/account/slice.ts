import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { websitesApi } from "@/features/websites/api";
import { accountApi } from "./api";

interface LicenseSnapshot {
  plan: string;
  allowance: number;
  used: number;
  limitReached: boolean;
}

interface AccountState {
  editProfileOpen: boolean;
  /**
   * Cross-page gate for "New website" / "Use template". Seeded by `getLicense`, then kept in step with
   * website create / delete / list responses so every screen reacts immediately, before any refetch lands.
   */
  license: LicenseSnapshot | null;
}

const initialState: AccountState = { editProfileOpen: false, license: null };

const withUsage = (l: LicenseSnapshot, used: number): LicenseSnapshot => {
  const u = Math.max(0, used);
  return { ...l, used: u, limitReached: u >= l.allowance };
};

const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    openEditProfile(state) {
      state.editProfileOpen = true;
    },
    closeEditProfile(state) {
      state.editProfileOpen = false;
    },
    setEditProfileOpen(state, a: PayloadAction<boolean>) {
      state.editProfileOpen = a.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(accountApi.endpoints.getLicense.matchFulfilled, (state, { payload }) => {
        state.license = { plan: payload.plan, allowance: payload.allowance, used: payload.used, limitReached: payload.limitReached };
      })
      .addMatcher(websitesApi.endpoints.getWebsites.matchFulfilled, (state, { payload }) => {
        if (state.license) state.license = withUsage(state.license, payload.meta.counts.all);
      })
      .addMatcher(websitesApi.endpoints.createWebsite.matchFulfilled, (state) => {
        if (state.license) state.license = withUsage(state.license, state.license.used + 1);
      })
      .addMatcher(websitesApi.endpoints.deleteWebsite.matchFulfilled, (state) => {
        if (state.license) state.license = withUsage(state.license, state.license.used - 1);
      })
      .addMatcher(accountApi.endpoints.updateMe.matchFulfilled, (state) => {
        state.editProfileOpen = false;
      });
  },
  selectors: {
    selectLicense: (s) => s.license,
    selectLimitReached: (s) => s.license?.limitReached ?? false,
    selectEditProfileOpen: (s) => s.editProfileOpen,
  },
});

export const { openEditProfile, closeEditProfile, setEditProfileOpen } = accountSlice.actions;
export const { selectLicense, selectLimitReached, selectEditProfileOpen } = accountSlice.selectors;
export default accountSlice.reducer;
