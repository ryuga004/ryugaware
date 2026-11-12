import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { customersApi } from "./api";
import type { CustomerCounts, CustomerFilters, CustomerSort, CustomerSortKey, CustomerStatus, SignInMethod } from "./types";

interface CustomersState {
  /** List controls (incl. sort, which the server applies). The customers live in the RTK Query cache. */
  filters: CustomerFilters;
  openCustomerId: string | null;
  pendingBlockId: string | null;
  pendingDeleteId: string | null;
  /** Unfiltered counts from the last list response (summary tiles). */
  counts: CustomerCounts | null;
}

export const DEFAULT_CUSTOMER_SORT: CustomerSort = { key: "joined", dir: "desc" };
export const DEFAULT_CUSTOMER_FILTERS: CustomerFilters = { search: "", websiteId: "all", status: "all", signIn: "all", sort: DEFAULT_CUSTOMER_SORT, page: 1, pageSize: 10 };

const initialState: CustomersState = { filters: DEFAULT_CUSTOMER_FILTERS, openCustomerId: null, pendingBlockId: null, pendingDeleteId: null, counts: null };

const customersSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    setCustomerSearch(state, a: PayloadAction<string>) {
      state.filters.search = a.payload;
      state.filters.page = 1;
    },
    setCustomerWebsite(state, a: PayloadAction<string>) {
      state.filters.websiteId = a.payload;
      state.filters.page = 1;
    },
    setCustomerStatus(state, a: PayloadAction<CustomerStatus | "all">) {
      state.filters.status = a.payload;
      state.filters.page = 1;
    },
    setCustomerSignIn(state, a: PayloadAction<SignInMethod | "all">) {
      state.filters.signIn = a.payload;
      state.filters.page = 1;
    },
    setCustomerSort(state, a: PayloadAction<CustomerSort>) {
      state.filters.sort = a.payload;
      state.filters.page = 1;
    },
    /** Column header click: same column flips direction, a new column starts descending. */
    toggleCustomerSort(state, a: PayloadAction<CustomerSortKey>) {
      const s = state.filters.sort;
      state.filters.sort = s.key === a.payload ? { key: s.key, dir: s.dir === "desc" ? "asc" : "desc" } : { key: a.payload, dir: "desc" };
      state.filters.page = 1;
    },
    setCustomerPage(state, a: PayloadAction<number>) {
      state.filters.page = a.payload;
    },
    setCustomerPageSize(state, a: PayloadAction<number>) {
      state.filters.pageSize = a.payload;
      state.filters.page = 1;
    },
    clearCustomerFilters(state) {
      state.filters = { ...DEFAULT_CUSTOMER_FILTERS, sort: state.filters.sort, pageSize: state.filters.pageSize };
    },
    openCustomer(state, a: PayloadAction<string>) {
      state.openCustomerId = a.payload;
    },
    closeCustomer(state) {
      state.openCustomerId = null;
    },
    requestBlockCustomer(state, a: PayloadAction<string>) {
      state.pendingBlockId = a.payload;
    },
    cancelBlockCustomer(state) {
      state.pendingBlockId = null;
    },
    requestDeleteCustomer(state, a: PayloadAction<string>) {
      state.pendingDeleteId = a.payload;
    },
    cancelDeleteCustomer(state) {
      state.pendingDeleteId = null;
    },
  },
  extraReducers: (builder) => {
    const { getCustomers, setCustomerBlocked, deleteCustomer } = customersApi.endpoints;
    builder
      .addMatcher(getCustomers.matchFulfilled, (state, { payload }) => {
        state.counts = payload.meta.counts;
        if (payload.meta.page !== state.filters.page) state.filters.page = payload.meta.page;
      })
      // Block is optimistic: the confirm dialog closes as soon as the request starts.
      .addMatcher(setCustomerBlocked.matchPending, (state) => {
        state.pendingBlockId = null;
      })
      .addMatcher(deleteCustomer.matchPending, (state, { meta }) => {
        state.pendingDeleteId = null;
        if (state.openCustomerId === meta.arg.originalArgs) state.openCustomerId = null;
      });
  },
  selectors: {
    selectCustomerFilters: (s) => s.filters,
    selectOpenCustomerId: (s) => s.openCustomerId,
    selectPendingBlockId: (s) => s.pendingBlockId,
    selectPendingDeleteCustomerId: (s) => s.pendingDeleteId,
    selectCustomerCounts: (s) => s.counts,
    selectCustomerHasFilters: (s) => s.filters.search !== "" || s.filters.websiteId !== "all" || s.filters.status !== "all" || s.filters.signIn !== "all",
  },
});

export const {
  setCustomerSearch,
  setCustomerWebsite,
  setCustomerStatus,
  setCustomerSignIn,
  setCustomerSort,
  toggleCustomerSort,
  setCustomerPage,
  setCustomerPageSize,
  clearCustomerFilters,
  openCustomer,
  closeCustomer,
  requestBlockCustomer,
  cancelBlockCustomer,
  requestDeleteCustomer,
  cancelDeleteCustomer,
} = customersSlice.actions;

export const {
  selectCustomerFilters,
  selectOpenCustomerId,
  selectPendingBlockId,
  selectPendingDeleteCustomerId,
  selectCustomerCounts,
  selectCustomerHasFilters,
} = customersSlice.selectors;

export default customersSlice.reducer;
