import { baseApi } from "@/lib/api/baseApi";
import { reportError, unwrap } from "@/lib/api/helpers";
import type { QueryParams } from "@/lib/api/types";
import { pushToast } from "@/features/ui/slice";
import type { CustomerDetail, CustomerExport, CustomerFilters, CustomersResponse } from "./types";

const LIST = { type: "Customer" as const, id: "LIST" };

/** Query params shared by the list and the CSV export (sort travels to the server). */
const filterParams = (f: Omit<CustomerFilters, "page" | "pageSize">): QueryParams => ({
  search: f.search || undefined,
  websiteId: f.websiteId,
  status: f.status,
  signIn: f.signIn,
  sort: f.sort.key,
  dir: f.sort.dir,
});

export const customersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCustomers: build.query<CustomersResponse, CustomerFilters>({
      query: (f) => ({ url: "/customers", params: { ...filterParams(f), page: f.page, pageSize: f.pageSize } }),
      providesTags: (res) => [LIST, ...(res?.data ?? []).map((c) => ({ type: "Customer" as const, id: c.id }))],
    }),

    getCustomer: build.query<CustomerDetail, string>({
      query: (id) => `/customers/${id}`,
      transformResponse: unwrap<CustomerDetail>,
      providesTags: (_r, _e, id) => [{ type: "Customer", id }],
    }),

    exportCustomers: build.query<CustomerExport, Omit<CustomerFilters, "page" | "pageSize">>({
      query: (f) => ({ url: "/customers/export", params: filterParams(f) }),
      transformResponse: unwrap<CustomerExport>,
      keepUnusedDataFor: 0,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: `Exported ${data.rows.toLocaleString("en-IN")} ${data.rows === 1 ? "user" : "users"}`, description: data.filename }));
        } catch (e) {
          reportError(dispatch, e, "Couldn’t export users");
        }
      },
    }),

    setCustomerBlocked: build.mutation<CustomerDetail, { id: string; blocked: boolean }>({
      query: ({ id, blocked }) => ({ url: `/customers/${id}`, method: "PATCH", body: { status: blocked ? "blocked" : "active" } }),
      transformResponse: unwrap<CustomerDetail>,
      // Status counts and status filters change, so the lists refetch after the optimistic patch.
      invalidatesTags: [LIST],
      async onQueryStarted({ id, blocked }, { dispatch, getState, queryFulfilled }) {
        const patches = [
          ...customersApi.util.selectCachedArgsForQuery(getState() as never, "getCustomers").map((arg) =>
            dispatch(
              customersApi.util.updateQueryData("getCustomers", arg, (draft) => {
                const c = draft.data.find((x) => x.id === id);
                if (c) c.status = blocked ? "blocked" : c.verified ? "active" : "unverified";
              }),
            ),
          ),
          dispatch(
            customersApi.util.updateQueryData("getCustomer", id, (draft) => {
              draft.status = blocked ? "blocked" : draft.verified ? "active" : "unverified";
            }),
          ),
        ];
        try {
          const { data } = await queryFulfilled;
          dispatch(customersApi.util.upsertQueryData("getCustomer", id, data));
          dispatch(
            pushToast(
              blocked
                ? { tone: "success", title: `${data.name} blocked`, description: `They can’t sign in or order on ${data.websiteName}.` }
                : { tone: "success", title: `${data.name} unblocked`, description: `They can sign in on ${data.websiteName} again.` },
            ),
          );
        } catch (e) {
          patches.forEach((p) => p.undo());
          reportError(dispatch, e, blocked ? "Couldn’t block user" : "Couldn’t unblock user");
        }
      },
    }),

    deleteCustomer: build.mutation<{ id: string; name: string }, string>({
      query: (id) => ({ url: `/customers/${id}`, method: "DELETE" }),
      transformResponse: unwrap<{ id: string; name: string }>,
      invalidatesTags: [LIST],
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        const patches = customersApi.util.selectCachedArgsForQuery(getState() as never, "getCustomers").map((arg) =>
          dispatch(
            customersApi.util.updateQueryData("getCustomers", arg, (draft) => {
              const c = draft.data.find((x) => x.id === id);
              if (!c) return;
              draft.data = draft.data.filter((x) => x.id !== id);
              draft.meta.total = Math.max(0, draft.meta.total - 1);
              draft.meta.counts.all -= 1;
              draft.meta.counts[c.status] -= 1;
            }),
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: `${data.name} deleted`, description: "Their account and saved addresses were removed." }));
        } catch (e) {
          patches.forEach((p) => p.undo());
          reportError(dispatch, e, "Couldn’t delete user");
        }
      },
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerQuery,
  useLazyExportCustomersQuery,
  useSetCustomerBlockedMutation,
  useDeleteCustomerMutation,
} = customersApi;
