import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { websitesApi } from "./api";
import type { WebsiteCounts, WebsiteFilters, WebsiteStatus, WebsiteType } from "./types";

export type WebsitesView = "grid" | "table";
export type WebsiteDrawer =
  | { mode: "closed" }
  | { mode: "create"; templateId?: string }
  | { mode: "edit"; websiteId: string };

interface WebsitesState {
  /** Client-side list controls. The list itself lives in the RTK Query cache. */
  filters: WebsiteFilters;
  view: WebsitesView;
  drawer: WebsiteDrawer;
  pendingDeleteId: string | null;
  /** Unfiltered counts per status, refreshed by every list response (feeds tabs/summary UI). */
  stats: WebsiteCounts | null;
  lastSyncedAt: string | null;
}

export const DEFAULT_WEBSITE_FILTERS: WebsiteFilters = { search: "", status: "all", type: "all", page: 1, pageSize: 6 };

const initialState: WebsitesState = {
  filters: DEFAULT_WEBSITE_FILTERS,
  view: "grid",
  drawer: { mode: "closed" },
  pendingDeleteId: null,
  stats: null,
  lastSyncedAt: null,
};

const websitesSlice = createSlice({
  name: "websites",
  initialState,
  reducers: {
    setSearch(state, a: PayloadAction<string>) {
      state.filters.search = a.payload;
      state.filters.page = 1;
    },
    setStatusFilter(state, a: PayloadAction<WebsiteStatus | "all">) {
      state.filters.status = a.payload;
      state.filters.page = 1;
    },
    setTypeFilter(state, a: PayloadAction<WebsiteType | "all">) {
      state.filters.type = a.payload;
      state.filters.page = 1;
    },
    setPage(state, a: PayloadAction<number>) {
      state.filters.page = a.payload;
    },
    setPageSize(state, a: PayloadAction<number>) {
      state.filters.pageSize = a.payload;
      state.filters.page = 1;
    },
    clearFilters(state) {
      state.filters = { ...DEFAULT_WEBSITE_FILTERS, pageSize: state.filters.pageSize };
    },
    setView(state, a: PayloadAction<WebsitesView>) {
      state.view = a.payload;
    },
    openCreateDrawer(state, a: PayloadAction<{ templateId?: string } | undefined>) {
      state.drawer = { mode: "create", templateId: a.payload?.templateId };
    },
    openEditDrawer(state, a: PayloadAction<string>) {
      state.drawer = { mode: "edit", websiteId: a.payload };
    },
    closeDrawer(state) {
      state.drawer = { mode: "closed" };
    },
    requestDelete(state, a: PayloadAction<string>) {
      state.pendingDeleteId = a.payload;
    },
    cancelDelete(state) {
      state.pendingDeleteId = null;
    },
  },
  extraReducers: (builder) => {
    const { getWebsites, createWebsite, updateWebsite, deleteWebsite } = websitesApi.endpoints;
    builder
      // Every list response refreshes the shared stats snapshot and corrects out-of-range pages.
      .addMatcher(getWebsites.matchFulfilled, (state, { payload }) => {
        state.stats = payload.meta.counts;
        state.lastSyncedAt = payload.meta.requestedAt;
        if (payload.meta.page !== state.filters.page) state.filters.page = payload.meta.page;
      })
      .addMatcher(createWebsite.matchFulfilled, (state, { payload }) => {
        state.drawer = { mode: "closed" };
        state.filters = { ...DEFAULT_WEBSITE_FILTERS, pageSize: state.filters.pageSize };
        state.lastSyncedAt = payload.updatedAt;
      })
      .addMatcher(updateWebsite.matchFulfilled, (state, { payload }) => {
        state.drawer = { mode: "closed" };
        state.lastSyncedAt = payload.updatedAt;
      })
      .addMatcher(deleteWebsite.matchFulfilled, (state, { meta }) => {
        state.pendingDeleteId = null;
        if (state.drawer.mode === "edit" && state.drawer.websiteId === meta.arg.originalArgs) state.drawer = { mode: "closed" };
      })
      .addMatcher(deleteWebsite.matchRejected, (state) => {
        state.pendingDeleteId = null;
      });
  },
  selectors: {
    selectWebsiteFilters: (s) => s.filters,
    selectWebsitesView: (s) => s.view,
    selectWebsiteDrawer: (s) => s.drawer,
    selectPendingDeleteId: (s) => s.pendingDeleteId,
    selectWebsiteStats: (s) => s.stats,
    selectLastSyncedAt: (s) => s.lastSyncedAt,
    selectHasActiveFilters: (s) => s.filters.search !== "" || s.filters.status !== "all" || s.filters.type !== "all",
  },
});

export const {
  setSearch,
  setStatusFilter,
  setTypeFilter,
  setPage,
  setPageSize,
  clearFilters,
  setView,
  openCreateDrawer,
  openEditDrawer,
  closeDrawer,
  requestDelete,
  cancelDelete,
} = websitesSlice.actions;

export const {
  selectWebsiteFilters,
  selectWebsitesView,
  selectWebsiteDrawer,
  selectPendingDeleteId,
  selectWebsiteStats,
  selectLastSyncedAt,
  selectHasActiveFilters,
} = websitesSlice.selectors;

export default websitesSlice.reducer;
