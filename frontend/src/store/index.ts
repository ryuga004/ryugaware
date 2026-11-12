import { combineSlices, configureStore, type Reducer, type UnknownAction } from "@reduxjs/toolkit";
import { baseApi } from "@/lib/api/baseApi";
import accountReducer from "@/features/account/slice";
import authReducer, { loggedOut } from "@/features/auth/slice";
import contactReducer from "@/features/contact/slice";
import customerAuthReducer from "@/features/customer-auth/slice";
import customersReducer from "@/features/customers/slice";
import deliveryReducer from "@/features/delivery/slice";
import domainsReducer from "@/features/domains/slice";
import paymentsReducer from "@/features/payments/slice";
import settingsReducer from "@/features/settings/slice";
import storageReducer from "@/features/storage/slice";
import templatesReducer from "@/features/templates/slice";
import uiReducer from "@/features/ui/slice";
import websitesReducer from "@/features/websites/slice";

/**
 * Root reducer.
 *  - `api`        RTK Query cache: the source of truth for all server-like data.
 *  - everything else: client-side state per feature (filters, drawers, drafts, toasts, derived snapshots).
 */
const appReducer = combineSlices(baseApi, {
  auth: authReducer,
  ui: uiReducer,
  websites: websitesReducer,
  templates: templatesReducer,
  settings: settingsReducer,
  account: accountReducer,
  domains: domainsReducer,
  payments: paymentsReducer,
  delivery: deliveryReducer,
  customers: customersReducer,
  storage: storageReducer,
  customerAuth: customerAuthReducer,
  contact: contactReducer,
});

export type RootState = ReturnType<typeof appReducer>;

/** Logging out wipes every slice (and the RTK Query cache) so the next user never sees stale data. */
const rootReducer: Reducer<RootState, UnknownAction> = (state, action) =>
  appReducer(loggedOut.match(action) ? undefined : state, action);

export const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    devTools: process.env.NODE_ENV !== "production",
  });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
