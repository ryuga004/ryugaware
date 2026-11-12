import { baseApi } from "@/lib/api/baseApi";
import { reportError, unwrap } from "@/lib/api/helpers";
import { pushToast } from "@/features/ui/slice";
import { actionResult } from "./constants";
import type {
  DeliveryMethod,
  DeliveryMethodFilters,
  DeliveryMethodInput,
  DeliveryMethodsResponse,
  ShipmentAction,
  ShipmentDetail,
  ShipmentFilters,
  ShipmentsResponse,
} from "./types";

const METHOD_LIST = { type: "DeliveryMethod" as const, id: "LIST" };
const SHIPMENT_LIST = { type: "Shipment" as const, id: "LIST" };

/** True for the list's enabled switch (optimistic) as opposed to a full edit from the drawer. */
export const isToggleOnly = (changes: Partial<DeliveryMethodInput>) => Object.keys(changes).length === 1 && "enabled" in changes;

export const deliveryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /* ───────────── Methods ───────────── */

    getDeliveryMethods: build.query<DeliveryMethodsResponse, DeliveryMethodFilters>({
      query: (f) => ({
        url: "/delivery/methods",
        params: { search: f.search || undefined, websiteId: f.websiteId, status: f.status, page: f.page, pageSize: f.pageSize },
      }),
      providesTags: (res) => [METHOD_LIST, ...(res?.data ?? []).map((m) => ({ type: "DeliveryMethod" as const, id: m.id }))],
    }),

    getDeliveryMethod: build.query<DeliveryMethod, string>({
      query: (id) => `/delivery/methods/${id}`,
      transformResponse: unwrap<DeliveryMethod>,
      providesTags: (_r, _e, id) => [{ type: "DeliveryMethod", id }],
    }),

    addDeliveryMethod: build.mutation<DeliveryMethod, DeliveryMethodInput>({
      query: (body) => ({ url: "/delivery/methods", method: "POST", body }),
      transformResponse: unwrap<DeliveryMethod>,
      invalidatesTags: [METHOD_LIST],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: `${data.name} added`, description: data.enabled ? "Customers can choose it at checkout." : "It stays hidden until you enable it." }));
        } catch (e) {
          reportError(dispatch, e, "Couldn’t add delivery method");
        }
      },
    }),

    addRecommendedMethods: build.mutation<{ added: number }, void>({
      query: () => ({ url: "/delivery/methods/presets", method: "POST" }),
      transformResponse: unwrap<{ added: number }>,
      invalidatesTags: [METHOD_LIST],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: `${data.added} delivery methods added`, description: "Review the fees and coverage, then you’re ready to ship." }));
        } catch (e) {
          reportError(dispatch, e, "Couldn’t add the recommended methods");
        }
      },
    }),

    updateDeliveryMethod: build.mutation<DeliveryMethod, { id: string; changes: Partial<DeliveryMethodInput> }>({
      query: ({ id, changes }) => ({ url: `/delivery/methods/${id}`, method: "PATCH", body: changes }),
      transformResponse: unwrap<DeliveryMethod>,
      invalidatesTags: (_r, _e, { id }) => [{ type: "DeliveryMethod", id }, METHOD_LIST],
      async onQueryStarted({ id, changes }, { dispatch, getState, queryFulfilled }) {
        // Only the enabled toggle is optimistic; full edits wait for the server (it may reject them).
        const toggle = isToggleOnly(changes);
        const patches = toggle
          ? deliveryApi.util.selectCachedArgsForQuery(getState() as never, "getDeliveryMethods").map((arg) =>
              dispatch(
                deliveryApi.util.updateQueryData("getDeliveryMethods", arg, (draft) => {
                  const m = draft.data.find((x) => x.id === id);
                  if (!m || m.enabled === changes.enabled) return;
                  m.enabled = Boolean(changes.enabled);
                  draft.meta.counts.enabled += m.enabled ? 1 : -1;
                  draft.meta.counts.disabled += m.enabled ? -1 : 1;
                }),
              ),
            )
          : [];
        try {
          const { data } = await queryFulfilled;
          dispatch(deliveryApi.util.upsertQueryData("getDeliveryMethod", id, data));
          dispatch(
            pushToast(
              toggle
                ? { tone: "success", title: data.enabled ? `${data.name} enabled` : `${data.name} disabled`, description: data.enabled ? "Customers can choose it at checkout." : "Hidden from checkout." }
                : { tone: "success", title: `${data.name} saved` },
            ),
          );
        } catch (e) {
          patches.forEach((p) => p.undo());
          reportError(dispatch, e, toggle ? "Couldn’t change the method" : "Couldn’t save delivery method");
        }
      },
    }),

    deleteDeliveryMethod: build.mutation<{ id: string; name: string }, string>({
      query: (id) => ({ url: `/delivery/methods/${id}`, method: "DELETE" }),
      transformResponse: unwrap<{ id: string; name: string }>,
      invalidatesTags: (_r, _e, id) => [{ type: "DeliveryMethod", id }, METHOD_LIST],
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        const patches = deliveryApi.util.selectCachedArgsForQuery(getState() as never, "getDeliveryMethods").map((arg) =>
          dispatch(
            deliveryApi.util.updateQueryData("getDeliveryMethods", arg, (draft) => {
              const m = draft.data.find((x) => x.id === id);
              if (!m) return;
              draft.data = draft.data.filter((x) => x.id !== id);
              draft.meta.total = Math.max(0, draft.meta.total - 1);
              draft.meta.counts.all -= 1;
              draft.meta.counts[m.enabled ? "enabled" : "disabled"] -= 1;
            }),
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: `${data.name} deleted` }));
        } catch (e) {
          patches.forEach((p) => p.undo());
          reportError(dispatch, e, "Couldn’t delete delivery method");
        }
      },
    }),

    /* ───────────── Shipments ───────────── */

    getShipments: build.query<ShipmentsResponse, ShipmentFilters>({
      query: (f) => ({
        url: "/shipments",
        params: { search: f.search || undefined, status: f.status, methodType: f.methodType, websiteId: f.websiteId, page: f.page, pageSize: f.pageSize },
      }),
      providesTags: (res) => [SHIPMENT_LIST, ...(res?.data ?? []).map((s) => ({ type: "Shipment" as const, id: s.id }))],
    }),

    getShipment: build.query<ShipmentDetail, string>({
      query: (id) => `/shipments/${id}`,
      transformResponse: unwrap<ShipmentDetail>,
      providesTags: (_r, _e, id) => [{ type: "Shipment", id }],
    }),

    updateShipmentStatus: build.mutation<ShipmentDetail, { id: string; action: ShipmentAction }>({
      query: ({ id, action }) => ({ url: `/shipments/${id}/status`, method: "POST", body: { action } }),
      transformResponse: unwrap<ShipmentDetail>,
      // Status changes move rows between filters and change the counts, so refetch the lists.
      invalidatesTags: [SHIPMENT_LIST],
      async onQueryStarted({ id, action }, { dispatch, getState, queryFulfilled }) {
        const patches = deliveryApi.util.selectCachedArgsForQuery(getState() as never, "getShipments").map((arg) =>
          dispatch(
            deliveryApi.util.updateQueryData("getShipments", arg, (draft) => {
              const s = draft.data.find((x) => x.id === id);
              if (s) s.status = actionResult(action, s.methodType);
            }),
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(deliveryApi.util.upsertQueryData("getShipment", id, data));
          const title = {
            ship: data.methodType === "pickup" ? `${data.id} is ready for pickup` : `${data.id} shipped`,
            deliver: `${data.id} marked as delivered`,
            retry: `Delivery re-attempt requested for ${data.id}`,
            return: `${data.id} marked as returned`,
          }[action];
          dispatch(pushToast({ tone: "success", title, description: data.awb ? `${data.carrier} · ${data.awb}` : data.carrier }));
        } catch (e) {
          patches.forEach((p) => p.undo());
          reportError(dispatch, e, "Couldn’t update the shipment");
        }
      },
    }),
  }),
});

export const {
  useGetDeliveryMethodsQuery,
  useGetDeliveryMethodQuery,
  useAddDeliveryMethodMutation,
  useAddRecommendedMethodsMutation,
  useUpdateDeliveryMethodMutation,
  useDeleteDeliveryMethodMutation,
  useGetShipmentsQuery,
  useGetShipmentQuery,
  useUpdateShipmentStatusMutation,
} = deliveryApi;
