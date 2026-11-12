import { baseApi } from "@/lib/api/baseApi";
import { reportError, unwrap } from "@/lib/api/helpers";
import { pushToast } from "@/features/ui/slice";
import { formatMoney } from "@/lib/format";
import type {
  PaymentMethod,
  PaymentMethodFilters,
  PaymentMethodInput,
  PaymentMethodsResponse,
  RevenueFilters,
  RevenueSummary,
  TransactionDetail,
  TransactionFilters,
  TransactionsResponse,
} from "./types";

const METHOD_LIST = { type: "PaymentMethod" as const, id: "LIST" };
const TX_LIST = { type: "Transaction" as const, id: "LIST" };

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /* ── Payment methods ── */
    getPaymentMethods: build.query<PaymentMethodsResponse, PaymentMethodFilters>({
      query: (f) => ({
        url: "/payments/methods",
        params: { search: f.search || undefined, type: f.type, websiteId: f.websiteId, page: f.page, pageSize: f.pageSize },
      }),
      providesTags: (res) => [METHOD_LIST, ...(res?.data ?? []).map((m) => ({ type: "PaymentMethod" as const, id: m.id }))],
    }),

    getPaymentMethod: build.query<PaymentMethod, string>({
      query: (id) => `/payments/methods/${id}`,
      transformResponse: unwrap<PaymentMethod>,
      providesTags: (_r, _e, id) => [{ type: "PaymentMethod", id }],
    }),

    addPaymentMethod: build.mutation<PaymentMethod, PaymentMethodInput>({
      query: (body) => ({ url: "/payments/methods", method: "POST", body }),
      transformResponse: unwrap<PaymentMethod>,
      invalidatesTags: [METHOD_LIST],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(paymentsApi.util.upsertQueryData("getPaymentMethod", data.id, data));
          dispatch(
            pushToast({
              tone: "success",
              title: `${data.displayName} added`,
              description: data.enabled ? "Customers can now choose it at checkout." : "It stays hidden at checkout until you enable it.",
            }),
          );
        } catch (e) {
          reportError(dispatch, e, "Couldn’t add payment method");
        }
      },
    }),

    updatePaymentMethod: build.mutation<PaymentMethod, { id: string; patch: Partial<PaymentMethodInput> }>({
      query: ({ id, patch }) => ({ url: `/payments/methods/${id}`, method: "PATCH", body: patch }),
      transformResponse: unwrap<PaymentMethod>,
      invalidatesTags: (_r, _e, { id }) => [{ type: "PaymentMethod", id }, METHOD_LIST],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(paymentsApi.util.upsertQueryData("getPaymentMethod", data.id, data));
          dispatch(pushToast({ tone: "success", title: `${data.displayName} saved` }));
        } catch (e) {
          reportError(dispatch, e, "Couldn’t save payment method");
        }
      },
    }),

    /** The list toggle: flips `enabled` in every cached list immediately and rolls back on failure. */
    setPaymentMethodEnabled: build.mutation<PaymentMethod, { id: string; enabled: boolean }>({
      query: ({ id, enabled }) => ({ url: `/payments/methods/${id}`, method: "PATCH", body: { enabled } }),
      transformResponse: unwrap<PaymentMethod>,
      invalidatesTags: (_r, error, { id }) => (error ? [{ type: "PaymentMethod", id }, METHOD_LIST] : []),
      async onQueryStarted({ id, enabled }, { dispatch, getState, queryFulfilled }) {
        const args = paymentsApi.util.selectCachedArgsForQuery(getState() as never, "getPaymentMethods");
        const patches = [
          ...args.map((arg) =>
            dispatch(
              paymentsApi.util.updateQueryData("getPaymentMethods", arg, (draft) => {
                const m = draft.data.find((x) => x.id === id);
                if (!m || m.enabled === enabled) return;
                m.enabled = enabled;
                draft.meta.counts.enabled += enabled ? 1 : -1;
              }),
            ),
          ),
          dispatch(
            paymentsApi.util.updateQueryData("getPaymentMethod", id, (draft) => {
              draft.enabled = enabled;
            }),
          ),
        ];
        try {
          const { data } = await queryFulfilled;
          dispatch(paymentsApi.util.upsertQueryData("getPaymentMethod", id, data));
          dispatch(
            pushToast({
              tone: "success",
              title: `${data.displayName} ${data.enabled ? "enabled" : "disabled"}`,
              description: data.enabled ? "Customers can choose it at checkout." : "Customers no longer see it at checkout.",
            }),
          );
        } catch (e) {
          patches.forEach((p) => p.undo());
          reportError(dispatch, e, enabled ? "Couldn’t enable payment method" : "Couldn’t disable payment method");
        }
      },
    }),

    deletePaymentMethod: build.mutation<{ id: string; displayName: string }, string>({
      query: (id) => ({ url: `/payments/methods/${id}`, method: "DELETE" }),
      transformResponse: unwrap<{ id: string; displayName: string }>,
      invalidatesTags: (_r, _e, id) => [{ type: "PaymentMethod", id }, METHOD_LIST],
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        const args = paymentsApi.util.selectCachedArgsForQuery(getState() as never, "getPaymentMethods");
        const patches = args.map((arg) =>
          dispatch(
            paymentsApi.util.updateQueryData("getPaymentMethods", arg, (draft) => {
              const removed = draft.data.find((m) => m.id === id);
              if (!removed) return;
              draft.data = draft.data.filter((m) => m.id !== id);
              draft.meta.total = Math.max(0, draft.meta.total - 1);
              draft.meta.counts.all = Math.max(0, draft.meta.counts.all - 1);
              if (removed.enabled) draft.meta.counts.enabled = Math.max(0, draft.meta.counts.enabled - 1);
            }),
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: `${data.displayName} deleted` }));
        } catch (e) {
          patches.forEach((p) => p.undo());
          reportError(dispatch, e, "Couldn’t delete payment method");
        }
      },
    }),

    /* ── Transactions ── */
    getTransactions: build.query<TransactionsResponse, TransactionFilters>({
      query: (f) => ({
        url: "/payments/transactions",
        params: {
          search: f.search || undefined,
          status: f.status,
          method: f.method,
          websiteId: f.websiteId,
          range: f.range,
          page: f.page,
          pageSize: f.pageSize,
        },
      }),
      providesTags: (res) => [TX_LIST, ...(res?.data ?? []).map((t) => ({ type: "Transaction" as const, id: t.id }))],
    }),

    getTransaction: build.query<TransactionDetail, string>({
      query: (id) => `/payments/transactions/${id}`,
      transformResponse: unwrap<TransactionDetail>,
      providesTags: (_r, _e, id) => [{ type: "Transaction", id }],
    }),

    refundTransaction: build.mutation<TransactionDetail, string>({
      query: (id) => ({ url: `/payments/transactions/${id}/refund`, method: "POST" }),
      transformResponse: unwrap<TransactionDetail>,
      // Totals and status filters change, so lists and revenue refetch.
      invalidatesTags: [TX_LIST, "Revenue"],
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        const args = paymentsApi.util.selectCachedArgsForQuery(getState() as never, "getTransactions");
        const patches = [
          ...args.map((arg) =>
            dispatch(
              paymentsApi.util.updateQueryData("getTransactions", arg, (draft) => {
                const t = draft.data.find((x) => x.id === id);
                if (t) t.status = "refunded";
              }),
            ),
          ),
          dispatch(
            paymentsApi.util.updateQueryData("getTransaction", id, (draft) => {
              draft.status = "refunded";
            }),
          ),
        ];
        try {
          const { data } = await queryFulfilled;
          dispatch(paymentsApi.util.upsertQueryData("getTransaction", id, data));
          dispatch(
            pushToast({
              tone: "success",
              title: `${formatMoney(data.amount, { paise: true })} refunded`,
              description: `${data.customerName} gets the money back in 5–7 working days.`,
            }),
          );
        } catch (e) {
          patches.forEach((p) => p.undo());
          reportError(dispatch, e, "Couldn’t refund payment");
        }
      },
    }),

    /* ── Revenue ── */
    getRevenue: build.query<RevenueSummary, RevenueFilters>({
      query: (f) => ({ url: "/payments/revenue", params: { range: f.range, websiteId: f.websiteId } }),
      transformResponse: unwrap<RevenueSummary>,
      providesTags: ["Revenue"],
    }),
  }),
});

export const {
  useGetPaymentMethodsQuery,
  useGetPaymentMethodQuery,
  useAddPaymentMethodMutation,
  useUpdatePaymentMethodMutation,
  useSetPaymentMethodEnabledMutation,
  useDeletePaymentMethodMutation,
  useGetTransactionsQuery,
  useGetTransactionQuery,
  useRefundTransactionMutation,
  useGetRevenueQuery,
} = paymentsApi;
