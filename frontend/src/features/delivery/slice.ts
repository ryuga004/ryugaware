import { createSlice, isAnyOf, type PayloadAction } from "@reduxjs/toolkit";
import { deliveryApi, isToggleOnly } from "./api";
import type { DeliveryMethodCounts, DeliveryMethodFilters, DeliveryType, ShipmentCounts, ShipmentFilters, ShipmentStatus } from "./types";

export type MethodDrawer = { mode: "closed" } | { mode: "add" } | { mode: "edit"; methodId: string };

interface DeliveryState {
  /** List controls only; methods and shipments live in the RTK Query cache. */
  methodFilters: DeliveryMethodFilters;
  methodDrawer: MethodDrawer;
  pendingDeleteMethodId: string | null;
  methodCounts: DeliveryMethodCounts | null;

  shipmentFilters: ShipmentFilters;
  openShipmentId: string | null;
  pendingReturnShipmentId: string | null;
  shipmentCounts: ShipmentCounts | null;
}

export const DEFAULT_METHOD_FILTERS: DeliveryMethodFilters = { search: "", websiteId: "all", status: "all", page: 1, pageSize: 10 };
export const DEFAULT_SHIPMENT_FILTERS: ShipmentFilters = { search: "", status: "all", methodType: "all", websiteId: "all", page: 1, pageSize: 10 };

const initialState: DeliveryState = {
  methodFilters: DEFAULT_METHOD_FILTERS,
  methodDrawer: { mode: "closed" },
  pendingDeleteMethodId: null,
  methodCounts: null,
  shipmentFilters: DEFAULT_SHIPMENT_FILTERS,
  openShipmentId: null,
  pendingReturnShipmentId: null,
  shipmentCounts: null,
};

const deliverySlice = createSlice({
  name: "delivery",
  initialState,
  reducers: {
    /* Methods */
    setMethodSearch(state, a: PayloadAction<string>) {
      state.methodFilters.search = a.payload;
      state.methodFilters.page = 1;
    },
    setMethodWebsite(state, a: PayloadAction<string>) {
      state.methodFilters.websiteId = a.payload;
      state.methodFilters.page = 1;
    },
    setMethodStatus(state, a: PayloadAction<DeliveryMethodFilters["status"]>) {
      state.methodFilters.status = a.payload;
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
    openAddMethod(state) {
      state.methodDrawer = { mode: "add" };
    },
    openEditMethod(state, a: PayloadAction<string>) {
      state.methodDrawer = { mode: "edit", methodId: a.payload };
    },
    closeMethodDrawer(state) {
      state.methodDrawer = { mode: "closed" };
    },
    requestDeleteMethod(state, a: PayloadAction<string>) {
      state.pendingDeleteMethodId = a.payload;
    },
    cancelDeleteMethod(state) {
      state.pendingDeleteMethodId = null;
    },

    /* Shipments */
    setShipmentSearch(state, a: PayloadAction<string>) {
      state.shipmentFilters.search = a.payload;
      state.shipmentFilters.page = 1;
    },
    setShipmentStatus(state, a: PayloadAction<ShipmentStatus | "all">) {
      state.shipmentFilters.status = a.payload;
      state.shipmentFilters.page = 1;
    },
    setShipmentMethod(state, a: PayloadAction<DeliveryType | "all">) {
      state.shipmentFilters.methodType = a.payload;
      state.shipmentFilters.page = 1;
    },
    setShipmentWebsite(state, a: PayloadAction<string>) {
      state.shipmentFilters.websiteId = a.payload;
      state.shipmentFilters.page = 1;
    },
    setShipmentPage(state, a: PayloadAction<number>) {
      state.shipmentFilters.page = a.payload;
    },
    setShipmentPageSize(state, a: PayloadAction<number>) {
      state.shipmentFilters.pageSize = a.payload;
      state.shipmentFilters.page = 1;
    },
    clearShipmentFilters(state) {
      state.shipmentFilters = { ...DEFAULT_SHIPMENT_FILTERS, pageSize: state.shipmentFilters.pageSize };
    },
    openShipment(state, a: PayloadAction<string>) {
      state.openShipmentId = a.payload;
    },
    closeShipment(state) {
      state.openShipmentId = null;
    },
    requestReturnShipment(state, a: PayloadAction<string>) {
      state.pendingReturnShipmentId = a.payload;
    },
    cancelReturnShipment(state) {
      state.pendingReturnShipmentId = null;
    },
  },
  extraReducers: (builder) => {
    const { getDeliveryMethods, addDeliveryMethod, updateDeliveryMethod, deleteDeliveryMethod, getShipments, updateShipmentStatus } = deliveryApi.endpoints;
    builder
      .addMatcher(getDeliveryMethods.matchFulfilled, (state, { payload }) => {
        state.methodCounts = payload.meta.counts;
        if (payload.meta.page !== state.methodFilters.page) state.methodFilters.page = payload.meta.page;
      })
      .addMatcher(addDeliveryMethod.matchFulfilled, (state) => {
        state.methodDrawer = { mode: "closed" };
      })
      // A full edit (not the optimistic toggle) closes the edit drawer when it succeeds.
      .addMatcher(updateDeliveryMethod.matchFulfilled, (state, { meta }) => {
        const { id, changes } = meta.arg.originalArgs;
        if (state.methodDrawer.mode === "edit" && state.methodDrawer.methodId === id && !isToggleOnly(changes)) {
          state.methodDrawer = { mode: "closed" };
        }
      })
      .addMatcher(deleteDeliveryMethod.matchFulfilled, (state, { meta }) => {
        state.pendingDeleteMethodId = null;
        if (state.methodDrawer.mode === "edit" && state.methodDrawer.methodId === meta.arg.originalArgs) state.methodDrawer = { mode: "closed" };
      })
      .addMatcher(deleteDeliveryMethod.matchRejected, (state) => {
        state.pendingDeleteMethodId = null;
      })
      .addMatcher(getShipments.matchFulfilled, (state, { payload }) => {
        state.shipmentCounts = payload.meta.counts;
        if (payload.meta.page !== state.shipmentFilters.page) state.shipmentFilters.page = payload.meta.page;
      })
      .addMatcher(isAnyOf(updateShipmentStatus.matchFulfilled, updateShipmentStatus.matchRejected), (state, { meta }) => {
        if (meta.arg.originalArgs.action === "return") state.pendingReturnShipmentId = null;
      });
  },
  selectors: {
    selectMethodFilters: (s) => s.methodFilters,
    selectMethodDrawer: (s) => s.methodDrawer,
    selectPendingDeleteMethodId: (s) => s.pendingDeleteMethodId,
    selectMethodCounts: (s) => s.methodCounts,
    selectMethodHasFilters: (s) => s.methodFilters.search !== "" || s.methodFilters.websiteId !== "all" || s.methodFilters.status !== "all",
    selectShipmentFilters: (s) => s.shipmentFilters,
    selectOpenShipmentId: (s) => s.openShipmentId,
    selectPendingReturnShipmentId: (s) => s.pendingReturnShipmentId,
    selectShipmentCounts: (s) => s.shipmentCounts,
    selectShipmentHasFilters: (s) =>
      s.shipmentFilters.search !== "" || s.shipmentFilters.status !== "all" || s.shipmentFilters.methodType !== "all" || s.shipmentFilters.websiteId !== "all",
  },
});

export const {
  setMethodSearch,
  setMethodWebsite,
  setMethodStatus,
  setMethodPage,
  setMethodPageSize,
  clearMethodFilters,
  openAddMethod,
  openEditMethod,
  closeMethodDrawer,
  requestDeleteMethod,
  cancelDeleteMethod,
  setShipmentSearch,
  setShipmentStatus,
  setShipmentMethod,
  setShipmentWebsite,
  setShipmentPage,
  setShipmentPageSize,
  clearShipmentFilters,
  openShipment,
  closeShipment,
  requestReturnShipment,
  cancelReturnShipment,
} = deliverySlice.actions;

export const {
  selectMethodFilters,
  selectMethodDrawer,
  selectPendingDeleteMethodId,
  selectMethodCounts,
  selectMethodHasFilters,
  selectShipmentFilters,
  selectOpenShipmentId,
  selectPendingReturnShipmentId,
  selectShipmentCounts,
  selectShipmentHasFilters,
} = deliverySlice.selectors;

export default deliverySlice.reducer;
