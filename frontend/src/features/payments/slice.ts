import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { paymentsApi } from "./api";
import type {
  PaymentMethod,
  PaymentMethodCounts,
  PaymentMethodFilters,
  PaymentProvider,
  PaymentType,
  RevenueFilters,
  RevenueRange,
  TransactionFilters,
  TransactionRange,
  TransactionStatus,
} from "./types";

export type MethodDrawer =
  | { mode: "closed" }
  | { mode: "add"; preset?: { type: PaymentType; provider: PaymentProvider } }
  | { mode: "edit"; methodId: string };

interface PaymentsState {
  /** List controls. Methods, transactions and revenue live in the RTK Query cache. */
  methodFilters: PaymentMethodFilters;
  txFilters: TransactionFilters;
  revenueFilters: RevenueFilters;
  drawer: MethodDrawer;
  /** Snapshot of the method awaiting delete confirmation (the optimistic delete drops it from the list). */
  pendingDeleteMethod: PaymentMethod | null;
  /** Transaction shown in the detail modal. */
  openTransactionId: string | null;
  pendingRefundId: string | null;
  /** Unfiltered method counts from the last list response (drives the header action and empty state). */
  methodCounts: PaymentMethodCounts | null;
}

export const DEFAULT_METHOD_FILTERS: PaymentMethodFilters = { search: "", type: "all", websiteId: "all", page: 1, pageSize: 10 };
export const DEFAULT_TX_FILTERS: TransactionFilters = { search: "", status: "all", method: "all", websiteId: "all", range: "30d", page: 1, pageSize: 10 };
export const DEFAULT_REVENUE_FILTERS: RevenueFilters = { range: "30d", websiteId: "all" };

const initialState: PaymentsState = {
  methodFilters: DEFAULT_METHOD_FILTERS,
  txFilters: DEFAULT_TX_FILTERS,
  revenueFilters: DEFAULT_REVENUE_FILTERS,
  drawer: { mode: "closed" },
  pendingDeleteMethod: null,
  openTransactionId: null,
  pendingRefundId: null,
  methodCounts: null,
};

const paymentsSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {
    /* Methods list */
    setMethodSearch(state, a: PayloadAction<string>) {
      state.methodFilters.search = a.payload;
      state.methodFilters.page = 1;
    },
    setMethodType(state, a: PayloadAction<PaymentType | "all">) {
      state.methodFilters.type = a.payload;
      state.methodFilters.page = 1;
    },
    setMethodWebsite(state, a: PayloadAction<string>) {
      state.methodFilters.websiteId = a.payload;
      state.methodFilters.page = 1;
    },
    setMethodPage(state, a: PayloadAction<number>) {
      state.methodFilters.page = a.payload;
    },
    setMethodPageSize(state, a: PayloadAction<number>) {
      state.methodFilters.pageSize = a.payload;
      state.methodFilters.page = 1;
    },
    clearMethodFilters(state) {
      state.methodFilters = { ...DEFAULT_METHOD_FILTERS, pageSize: state.methodFilters.pageSize };
    },
    openAddMethod(state, a: PayloadAction<{ type: PaymentType; provider: PaymentProvider } | undefined>) {
      state.drawer = { mode: "add", preset: a.payload };
    },
    openEditMethod(state, a: PayloadAction<string>) {
      state.drawer = { mode: "edit", methodId: a.payload };
    },
    closeMethodDrawer(state) {
      state.drawer = { mode: "closed" };
    },
    requestDeleteMethod(state, a: PayloadAction<PaymentMethod>) {
      state.pendingDeleteMethod = a.payload;
    },
    cancelDeleteMethod(state) {
      state.pendingDeleteMethod = null;
    },

    /* Transactions */
    setTxSearch(state, a: PayloadAction<string>) {
      state.txFilters.search = a.payload;
      state.txFilters.page = 1;
    },
    setTxStatus(state, a: PayloadAction<TransactionStatus | "all">) {
      state.txFilters.status = a.payload;
      state.txFilters.page = 1;
    },
    setTxMethod(state, a: PayloadAction<PaymentType | "all">) {
      state.txFilters.method = a.payload;
      state.txFilters.page = 1;
    },
    setTxWebsite(state, a: PayloadAction<string>) {
      state.txFilters.websiteId = a.payload;
      state.txFilters.page = 1;
    },
    setTxRange(state, a: PayloadAction<TransactionRange>) {
      state.txFilters.range = a.payload;
      state.txFilters.page = 1;
    },
    setTxPage(state, a: PayloadAction<number>) {
      state.txFilters.page = a.payload;
    },
    setTxPageSize(state, a: PayloadAction<number>) {
      state.txFilters.pageSize = a.payload;
      state.txFilters.page = 1;
    },
    clearTxFilters(state) {
      state.txFilters = { ...DEFAULT_TX_FILTERS, pageSize: state.txFilters.pageSize };
    },
    openTransaction(state, a: PayloadAction<string>) {
      state.openTransactionId = a.payload;
    },
    closeTransaction(state) {
      state.openTransactionId = null;
    },
    requestRefund(state, a: PayloadAction<string>) {
      state.pendingRefundId = a.payload;
    },
    cancelRefund(state) {
      state.pendingRefundId = null;
    },

    /* Revenue */
    setRevenueRange(state, a: PayloadAction<RevenueRange>) {
      state.revenueFilters.range = a.payload;
    },
    setRevenueWebsite(state, a: PayloadAction<string>) {
      state.revenueFilters.websiteId = a.payload;
    },
  },
  extraReducers: (builder) => {
    const { getPaymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod, getTransactions, refundTransaction } = paymentsApi.endpoints;
    builder
      .addMatcher(getPaymentMethods.matchFulfilled, (state, { payload }) => {
        state.methodCounts = payload.meta.counts;
        if (payload.meta.page !== state.methodFilters.page) state.methodFilters.page = payload.meta.page;
      })
      // The optimistic delete updates cached counts; mirror it so the empty state appears straight away.
      .addMatcher(deletePaymentMethod.matchPending, (state) => {
        if (state.methodCounts) state.methodCounts.all = Math.max(0, state.methodCounts.all - 1);
      })
      .addMatcher(addPaymentMethod.matchFulfilled, (state) => {
        state.drawer = { mode: "closed" };
      })
      .addMatcher(updatePaymentMethod.matchFulfilled, (state) => {
        state.drawer = { mode: "closed" };
      })
      .addMatcher(deletePaymentMethod.matchFulfilled, (state, { meta }) => {
        state.pendingDeleteMethod = null;
        if (state.drawer.mode === "edit" && state.drawer.methodId === meta.arg.originalArgs) state.drawer = { mode: "closed" };
      })
      .addMatcher(deletePaymentMethod.matchRejected, (state) => {
        state.pendingDeleteMethod = null;
        if (state.methodCounts) state.methodCounts.all += 1;
      })
      .addMatcher(getTransactions.matchFulfilled, (state, { payload }) => {
        if (payload.meta.page !== state.txFilters.page) state.txFilters.page = payload.meta.page;
      })
      .addMatcher(refundTransaction.matchFulfilled, (state) => {
        state.pendingRefundId = null;
      })
      .addMatcher(refundTransaction.matchRejected, (state) => {
        state.pendingRefundId = null;
      });
  },
  selectors: {
    selectMethodFilters: (s) => s.methodFilters,
    selectMethodHasFilters: (s) => s.methodFilters.search !== "" || s.methodFilters.type !== "all" || s.methodFilters.websiteId !== "all",
    selectMethodDrawer: (s) => s.drawer,
    selectPendingDeleteMethod: (s) => s.pendingDeleteMethod,
    selectMethodCounts: (s) => s.methodCounts,
    selectTxFilters: (s) => s.txFilters,
    selectTxHasFilters: (s) =>
      s.txFilters.search !== "" ||
      s.txFilters.status !== "all" ||
      s.txFilters.method !== "all" ||
      s.txFilters.websiteId !== "all" ||
      s.txFilters.range !== DEFAULT_TX_FILTERS.range,
    selectOpenTransactionId: (s) => s.openTransactionId,
    selectPendingRefundId: (s) => s.pendingRefundId,
    selectRevenueFilters: (s) => s.revenueFilters,
  },
});

export const {
  setMethodSearch,
  setMethodType,
  setMethodWebsite,
  setMethodPage,
  setMethodPageSize,
  clearMethodFilters,
  openAddMethod,
  openEditMethod,
  closeMethodDrawer,
  requestDeleteMethod,
  cancelDeleteMethod,
  setTxSearch,
  setTxStatus,
  setTxMethod,
  setTxWebsite,
  setTxRange,
  setTxPage,
  setTxPageSize,
  clearTxFilters,
  openTransaction,
  closeTransaction,
  requestRefund,
  cancelRefund,
  setRevenueRange,
  setRevenueWebsite,
} = paymentsSlice.actions;

export const {
  selectMethodFilters,
  selectMethodHasFilters,
  selectMethodDrawer,
  selectPendingDeleteMethod,
  selectMethodCounts,
  selectTxFilters,
  selectTxHasFilters,
  selectOpenTransactionId,
  selectPendingRefundId,
  selectRevenueFilters,
} = paymentsSlice.selectors;

export default paymentsSlice.reducer;
