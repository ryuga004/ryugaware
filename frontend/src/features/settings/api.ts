import { baseApi } from "@/lib/api/baseApi";
import { getErrorMessage, isApiError, type Paginated, type Single } from "@/lib/api/types";
import { pushToast } from "@/features/ui/slice";
import type { ChangePasswordInput, Organization, Session, SettingsOptions, UpdateOrganizationInput } from "./types";

const unwrap = <T,>(res: Single<T>) => res.data;

type SessionsResponse = Paginated<Session, { total: number }> | { data: Session[]; meta: { total: number } };

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOrganization: build.query<Organization, void>({
      query: () => "/organization",
      transformResponse: unwrap<Organization>,
      providesTags: ["Organization"],
    }),

    getSettingsOptions: build.query<SettingsOptions, void>({
      query: () => "/settings/options",
      transformResponse: unwrap<SettingsOptions>,
      providesTags: ["Options"],
      keepUnusedDataFor: 3600,
    }),

    updateOrganization: build.mutation<Organization, UpdateOrganizationInput>({
      query: (body) => ({ url: "/organization", method: "PATCH", body }),
      transformResponse: unwrap<Organization>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Write the saved organization straight into the cache (no refetch round-trip).
          dispatch(settingsApi.util.updateQueryData("getOrganization", undefined, () => data));
          dispatch(pushToast({ tone: "success", title: "Settings saved" }));
        } catch (e) {
          const error = (e as { error?: unknown }).error;
          if (!(isApiError(error) && error.data.fieldErrors)) {
            dispatch(pushToast({ tone: "error", title: "Couldn’t save settings", description: getErrorMessage(error) }));
          }
        }
      },
    }),

    getSessions: build.query<Session[], void>({
      query: () => "/sessions",
      transformResponse: (res: SessionsResponse) => res.data,
      providesTags: ["Session"],
    }),

    signOutSession: build.mutation<{ id: string; device: string }, string>({
      query: (id) => ({ url: `/sessions/${id}`, method: "DELETE" }),
      transformResponse: unwrap<{ id: string; device: string }>,
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          settingsApi.util.updateQueryData("getSessions", undefined, (draft) => draft.filter((s) => s.id !== id)),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: "Signed out", description: data.device }));
        } catch (e) {
          patch.undo();
          dispatch(pushToast({ tone: "error", title: "Couldn’t sign out", description: getErrorMessage((e as { error?: unknown }).error) }));
        }
      },
    }),

    signOutOtherSessions: build.mutation<{ removed: number }, void>({
      query: () => ({ url: "/sessions", method: "DELETE" }),
      transformResponse: unwrap<{ removed: number }>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patch = dispatch(settingsApi.util.updateQueryData("getSessions", undefined, (draft) => draft.filter((s) => s.current)));
        try {
          const { data } = await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: `Signed out of ${data.removed} other session${data.removed === 1 ? "" : "s"}` }));
        } catch {
          patch.undo();
          dispatch(pushToast({ tone: "error", title: "Couldn’t sign out of other sessions" }));
        }
      },
    }),

    changePassword: build.mutation<{ passwordChangedAt: string; signedOutSessions: number }, ChangePasswordInput>({
      query: (body) => ({ url: "/account/password", method: "POST", body }),
      transformResponse: unwrap<{ passwordChangedAt: string; signedOutSessions: number }>,
      invalidatesTags: ["Session", "Me"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: "Password updated" }));
        } catch (e) {
          const error = (e as { error?: unknown }).error;
          if (!(isApiError(error) && error.data.fieldErrors)) {
            dispatch(pushToast({ tone: "error", title: "Couldn’t update password", description: getErrorMessage(error) }));
          }
        }
      },
    }),
  }),
});

export const {
  useGetOrganizationQuery,
  useGetSettingsOptionsQuery,
  useUpdateOrganizationMutation,
  useGetSessionsQuery,
  useSignOutSessionMutation,
  useSignOutOtherSessionsMutation,
  useChangePasswordMutation,
} = settingsApi;
