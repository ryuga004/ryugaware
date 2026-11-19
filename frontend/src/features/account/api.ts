import { baseApi } from "@/lib/api/baseApi";
import { getErrorMessage, isApiError, type Single } from "@/lib/api/types";
import { pushToast } from "@/features/ui/slice";
import { authApi } from "@/features/auth/api";
import type { AuthUser } from "@/features/auth/types";
import type { License, UpdateMeInput } from "./types";

const unwrap = <T,>(res: Single<T>) => res.data;

export const accountApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    updateMe: build.mutation<AuthUser, UpdateMeInput>({
      query: (body) => ({ url: "/me", method: "PATCH", body }),
      transformResponse: unwrap<AuthUser>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Every screen reads the profile from /auth/me, so patching that one entry updates all of them.
          dispatch(authApi.util.updateQueryData("getSession", undefined, (draft) => {
            draft.user = data;
          }));
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

export const { useUpdateMeMutation, useGetLicenseQuery } = accountApi;
