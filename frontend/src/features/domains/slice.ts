import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { domainsApi } from "./api";
import type { DomainCounts, DomainFilters, DomainStatus } from "./types";

export type DomainsDrawer = { mode: "closed" } | { mode: "add"; websiteId?: string } | { mode: "dns"; domainId: string };

interface DomainsState {
  /** List controls. The domains themselves live in the RTK Query cache. */
  filters: DomainFilters;
  drawer: DomainsDrawer;
  pendingRemoveId: string | null;
  /** Unfiltered counts per status from the last list response. */
  counts: DomainCounts | null;
}

export const DEFAULT_DOMAIN_FILTERS: DomainFilters = { search: "", status: "all", websiteId: "all", page: 1, pageSize: 10 };

const initialState: DomainsState = { filters: DEFAULT_DOMAIN_FILTERS, drawer: { mode: "closed" }, pendingRemoveId: null, counts: null };

const domainsSlice = createSlice({
  name: "domains",
  initialState,
  reducers: {
    setDomainSearch(state, a: PayloadAction<string>) {
      state.filters.search = a.payload;
      state.filters.page = 1;
    },
    setDomainStatus(state, a: PayloadAction<DomainStatus | "all">) {
      state.filters.status = a.payload;
      state.filters.page = 1;
    },
    setDomainWebsite(state, a: PayloadAction<string>) {
      state.filters.websiteId = a.payload;
      state.filters.page = 1;
    },
    setDomainPage(state, a: PayloadAction<number>) {
      state.filters.page = a.payload;
    },
    setDomainPageSize(state, a: PayloadAction<number>) {
      state.filters.pageSize = a.payload;
      state.filters.page = 1;
    },
    clearDomainFilters(state) {
      state.filters = { ...DEFAULT_DOMAIN_FILTERS, pageSize: state.filters.pageSize };
    },
    openAddDomain(state, a: PayloadAction<{ websiteId?: string } | undefined>) {
      state.drawer = { mode: "add", websiteId: a.payload?.websiteId };
    },
    openDnsDrawer(state, a: PayloadAction<string>) {
      state.drawer = { mode: "dns", domainId: a.payload };
    },
    closeDomainDrawer(state) {
      state.drawer = { mode: "closed" };
    },
    requestRemoveDomain(state, a: PayloadAction<string>) {
      state.pendingRemoveId = a.payload;
    },
    cancelRemoveDomain(state) {
      state.pendingRemoveId = null;
    },
  },
  extraReducers: (builder) => {
    const { getDomains, addDomain, removeDomain } = domainsApi.endpoints;
    builder
      .addMatcher(getDomains.matchFulfilled, (state, { payload }) => {
        state.counts = payload.meta.counts;
        if (payload.meta.page !== state.filters.page) state.filters.page = payload.meta.page;
      })
      // After adding, go straight to the DNS instructions for the new domain.
      .addMatcher(addDomain.matchFulfilled, (state, { payload }) => {
        state.drawer = { mode: "dns", domainId: payload.id };
      })
      .addMatcher(removeDomain.matchFulfilled, (state, { meta }) => {
        state.pendingRemoveId = null;
        if (state.drawer.mode === "dns" && state.drawer.domainId === meta.arg.originalArgs) state.drawer = { mode: "closed" };
      })
      .addMatcher(removeDomain.matchRejected, (state) => {
        state.pendingRemoveId = null;
      });
  },
  selectors: {
    selectDomainFilters: (s) => s.filters,
    selectDomainDrawer: (s) => s.drawer,
    selectPendingRemoveDomainId: (s) => s.pendingRemoveId,
    selectDomainCounts: (s) => s.counts,
    selectDomainHasFilters: (s) => s.filters.search !== "" || s.filters.status !== "all" || s.filters.websiteId !== "all",
  },
});

export const {
  setDomainSearch,
  setDomainStatus,
  setDomainWebsite,
  setDomainPage,
  setDomainPageSize,
  clearDomainFilters,
  openAddDomain,
  openDnsDrawer,
  closeDomainDrawer,
  requestRemoveDomain,
  cancelRemoveDomain,
} = domainsSlice.actions;

export const { selectDomainFilters, selectDomainDrawer, selectPendingRemoveDomainId, selectDomainCounts, selectDomainHasFilters } = domainsSlice.selectors;

export default domainsSlice.reducer;
