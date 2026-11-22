import { baseApi } from "@/lib/api/baseApi";
import { getErrorMessage, type Single } from "@/lib/api/types";
import { pushToast } from "@/features/ui/slice";
import type { StoreSettingsPatch, WebsiteStoreSettings } from "./types";

const unwrap = <T,>(res: Single<T>) => res.data;

export const websiteSettingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStoreSettings: build.query<WebsiteStoreSettings, string>({
      query: (websiteId) => `/websites/${websiteId}/store-settings`,
      transformResponse: unwrap<WebsiteStoreSettings>,
      providesTags: (_r, _e, websiteId) => [{ type: "StoreSettings", id: websiteId }],
    }),

    updateStoreSettings: build.mutation<WebsiteStoreSettings, { websiteId: string; patch: StoreSettingsPatch }>({
      query: ({ websiteId, patch }) => ({ url: `/websites/${websiteId}/store-settings`, method: "PATCH", body: patch }),
      transformResponse: unwrap<WebsiteStoreSettings>,
      // The method records these toggles write to are owned by other sections, so their lists refresh too.
      invalidatesTags: (_r, _e, { websiteId }) => [
        { type: "StoreSettings", id: websiteId },
        { type: "SiteContent", id: websiteId },
        "PaymentMethod",
        "DeliveryMethod",
        { type: "Website", id: websiteId },
      ],
      async onQueryStarted({ websiteId, patch }, { dispatch, queryFulfilled }) {
        // Switches should feel immediate; the request confirms or rolls back.
        const undo = dispatch(
          websiteSettingsApi.util.updateQueryData("getStoreSettings", websiteId, (draft) => {
            if (patch.payment) {
              const row = draft.payments.find((p) => p.id === patch.payment!.id);
              if (row) row.selected = patch.payment.selected;
            }
            if (patch.delivery) {
              const row = draft.delivery.find((d) => d.id === patch.delivery!.id);
              if (row) row.selected = patch.delivery.selected;
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch (e) {
          undo.undo();
          dispatch(pushToast({ tone: "error", title: "Couldn’t save that change", description: getErrorMessage((e as { error?: unknown }).error) }));
        }
      },
    }),
  }),
});

export const { useGetStoreSettingsQuery, useUpdateStoreSettingsMutation } = websiteSettingsApi;
