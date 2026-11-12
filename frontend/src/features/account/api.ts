import { baseApi } from "@/lib/api/baseApi";
import { getErrorMessage, isApiError, type Single } from "@/lib/api/types";
import { pushToast } from "@/features/ui/slice";
import type { License, UpdateMeInput, User } from "./types";

const unwrap = <T,>(res: Single<T>) => res.data;

export const accountApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<User, void>({
      query: () => "/me",
      transformResponse: unwrap<User>,
      providesTags: ["Me"],
    }),

    updateMe: build.mutation<User, UpdateMeInput>({
      query: (body) => ({ url: "/me", method: "PATCH", body }),
      transformResponse: unwrap<User>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // The sidebar user menu and profile page read the same cache entry, so both update instantly.
          dispatch(accountApi.util.updateQueryData("getMe", undefined, () => data));
          dispatch(pushToast({ tone: "success", title: "Profile updated" }));
        } catch (e) {
          const error = (e as { error?: unknown }).error;
          if (!(isApiError(error) && error.data.fieldErrors)) {
            dispatch(pushToast({ tone: "error", title: "Couldn’t update profile", description: getErrorMessage(error) }));
          }
        }
      },
    }),

    getLicense: build.query<License, void>({
      query: () => "/license",
      transformResponse: unwrap<License>,
      providesTags: ["License"],
    }),
  }),
});

export const { useGetMeQuery, useUpdateMeMutation, useGetLicenseQuery } = accountApi;
