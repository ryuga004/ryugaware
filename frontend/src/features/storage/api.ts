import { baseApi } from "@/lib/api/baseApi";
import type { Single } from "@/lib/api/types";
import type { Storage } from "./types";

export const storageApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStorage: build.query<Storage, void>({
      query: () => "/storage",
      transformResponse: (res: Single<Storage>) => res.data,
      providesTags: ["StorageConfig"],
    }),
  }),
});

export const { useGetStorageQuery } = storageApi;
