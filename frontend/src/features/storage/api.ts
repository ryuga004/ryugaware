import { baseApi } from "@/lib/api/baseApi";
import { getErrorMessage, type Single } from "@/lib/api/types";
import { pushToast } from "@/features/ui/slice";
import type { AssetListArgs, AssetListing, Storage } from "./types";

export const storageApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStorage: build.query<Storage, void>({
      query: () => "/storage",
      transformResponse: (res: Single<Storage>) => res.data,
      providesTags: ["StorageConfig"],
    }),

    /** One level of a website's own prefix: the folders and files directly under `path`. */
    getWebsiteAssets: build.query<AssetListing, AssetListArgs>({
      query: ({ websiteId, path }) => ({ url: `/websites/${websiteId}/assets`, params: { path: path || undefined } }),
      transformResponse: (res: Single<AssetListing>) => res.data,
      providesTags: (_r, _e, { websiteId }) => [{ type: "Asset", id: websiteId }],
    }),

    deleteAsset: build.mutation<void, { websiteId: string; key: string; name: string }>({
      query: ({ websiteId, key }) => ({ url: `/websites/${websiteId}/assets`, method: "DELETE", params: { key } }),
      invalidatesTags: (_r, _e, { websiteId }) => [{ type: "Asset", id: websiteId }, "StorageConfig"],
      async onQueryStarted({ name }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: `${name} deleted` }));
        } catch (e) {
          dispatch(
            pushToast({
              tone: "error",
              title: "Couldn’t delete that file",
              description: getErrorMessage((e as { error?: unknown }).error),
            }),
          );
        }
      },
    }),
  }),
});

export const { useGetStorageQuery, useGetWebsiteAssetsQuery, useDeleteAssetMutation } = storageApi;
