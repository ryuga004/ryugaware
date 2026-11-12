import { baseApi } from "@/lib/api/baseApi";
import { reportError, unwrap } from "@/lib/api/helpers";
import { pushToast } from "@/features/ui/slice";
import type { StorageConfig, StorageInput, StorageTestResult } from "./types";

export const storageApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStorageConfig: build.query<StorageConfig, void>({
      query: () => "/storage",
      transformResponse: unwrap<StorageConfig>,
      providesTags: ["StorageConfig"],
    }),

    /** Connects or updates the bucket. The backend runs the connection check and stores the result. */
    saveStorageConfig: build.mutation<StorageConfig, StorageInput>({
      query: (body) => ({ url: "/storage", method: "PUT", body }),
      transformResponse: unwrap<StorageConfig>,
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        const before = storageApi.endpoints.getStorageConfig.select()(getState() as never).data?.status;
        try {
          const { data } = await queryFulfilled;
          dispatch(storageApi.util.upsertQueryData("getStorageConfig", undefined, data));
          if (data.status === "connected") {
            dispatch(
              pushToast(
                before === "connected"
                  ? { tone: "success", title: "Storage settings saved" }
                  : { tone: "success", title: `${data.bucket} connected`, description: "New uploads go to your bucket." },
              ),
            );
          } else {
            dispatch(pushToast({ tone: "error", title: "Saved, but the connection check failed", description: "Uploads keep going to Ryugaware storage until it passes." }));
          }
        } catch (e) {
          reportError(dispatch, e, "Couldn’t save storage settings");
        }
      },
    }),

    /** Tests the given (unsaved) values, or the saved configuration when `input` is omitted. */
    testStorageConnection: build.mutation<StorageTestResult, { input?: StorageInput }>({
      query: (body) => ({ url: "/storage/test", method: "POST", body }),
      transformResponse: unwrap<StorageTestResult>,
      invalidatesTags: (res) => (res?.saved ? ["StorageConfig"] : []),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            pushToast(
              data.ok
                ? { tone: "success", title: "Connection works", description: "All checks passed." }
                : { tone: "error", title: "Connection check failed", description: data.steps.find((s) => s.status === "failed")?.message },
            ),
          );
        } catch (e) {
          reportError(dispatch, e, "Couldn’t test the connection");
        }
      },
    }),

    disconnectStorage: build.mutation<StorageConfig, void>({
      query: () => ({ url: "/storage", method: "DELETE" }),
      transformResponse: unwrap<StorageConfig>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(storageApi.util.upsertQueryData("getStorageConfig", undefined, data));
          dispatch(pushToast({ tone: "success", title: "Bucket disconnected", description: "New uploads go to Ryugaware storage." }));
        } catch (e) {
          reportError(dispatch, e, "Couldn’t disconnect the bucket");
        }
      },
    }),
  }),
});

export const { useGetStorageConfigQuery, useSaveStorageConfigMutation, useTestStorageConnectionMutation, useDisconnectStorageMutation } = storageApi;
