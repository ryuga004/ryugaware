import { baseApi } from "@/lib/api/baseApi";
import { getErrorMessage, type Single } from "@/lib/api/types";
import { pushToast } from "@/features/ui/slice";
import type { SiteContent, StorefrontResponse } from "./types";

const unwrap = <T,>(res: Single<T>) => res.data;

export const storefrontApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Public read for the storefront itself: host → website → content. */
    getStorefront: build.query<StorefrontResponse, string>({
      query: (site) => `/storefront/${site}`,
      transformResponse: unwrap<StorefrontResponse>,
      providesTags: (res) => (res ? [{ type: "SiteContent" as const, id: res.websiteId }] : []),
    }),

    getSiteContent: build.query<SiteContent, string>({
      query: (websiteId) => `/site-content/${websiteId}`,
      transformResponse: unwrap<SiteContent>,
      providesTags: (_r, _e, websiteId) => [{ type: "SiteContent", id: websiteId }],
    }),

    saveSiteContent: build.mutation<SiteContent, { websiteId: string; content: SiteContent }>({
      query: ({ websiteId, content }) => ({ url: `/site-content/${websiteId}`, method: "PUT", body: content }),
      transformResponse: unwrap<SiteContent>,
      invalidatesTags: (_r, _e, { websiteId }) => [{ type: "SiteContent", id: websiteId }, { type: "Website", id: websiteId }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: "Changes saved" }));
        } catch (e) {
          dispatch(pushToast({ tone: "error", title: "Couldn’t save changes", description: getErrorMessage((e as { error?: unknown }).error) }));
        }
      },
    }),
  }),
});

export const { useGetStorefrontQuery, useGetSiteContentQuery, useSaveSiteContentMutation } = storefrontApi;
