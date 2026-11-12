import { baseApi } from "@/lib/api/baseApi";
import { reportError, unwrap } from "@/lib/api/helpers";
import { pushToast } from "@/features/ui/slice";
import type { ContactInput, ContactScope, ContactScopeResponse } from "./types";

type Dispatch = (a: unknown) => unknown;

/** Saving one scope changes what the others show (inherited details, the overrides list): mark the other cached scopes stale. */
function invalidateOtherScopes(dispatch: Dispatch, getState: () => unknown, scope: ContactScope) {
  const others = contactApi.util.selectCachedArgsForQuery(getState() as never, "getContactDetails").filter((s) => s !== scope);
  if (others.length) dispatch(contactApi.util.invalidateTags(others.map((id) => ({ type: "ContactDetails" as const, id }))));
}

export const contactApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getContactDetails: build.query<ContactScopeResponse, ContactScope>({
      query: (scope) => ({ url: "/contact", params: { scope } }),
      transformResponse: unwrap<ContactScopeResponse>,
      providesTags: (_r, _e, scope) => [{ type: "ContactDetails", id: scope }],
    }),

    saveContactDetails: build.mutation<ContactScopeResponse, { scope: ContactScope; input: ContactInput }>({
      query: ({ scope, input }) => ({ url: `/contact/${scope}`, method: "PUT", body: input }),
      transformResponse: unwrap<ContactScopeResponse>,
      async onQueryStarted({ scope }, { dispatch, getState, queryFulfilled }) {
        const before = contactApi.endpoints.getContactDetails.select(scope)(getState() as never).data;
        try {
          const { data } = await queryFulfilled;
          dispatch(contactApi.util.upsertQueryData("getContactDetails", scope, data));
          invalidateOtherScopes(dispatch, getState, scope);
          const title = data.websiteName
            ? before?.inherited
              ? `${data.websiteName} now has its own contact details`
              : `Contact details saved for ${data.websiteName}`
            : before?.configured
              ? "Default contact details saved"
              : "Contact details added";
          dispatch(pushToast({ tone: "success", title }));
        } catch (e) {
          reportError(dispatch, e, "Couldn’t save contact details");
        }
      },
    }),

    resetContactDetails: build.mutation<ContactScopeResponse, ContactScope>({
      query: (scope) => ({ url: `/contact/${scope}`, method: "DELETE" }),
      transformResponse: unwrap<ContactScopeResponse>,
      async onQueryStarted(scope, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(contactApi.util.upsertQueryData("getContactDetails", scope, data));
          invalidateOtherScopes(dispatch, getState, scope);
          dispatch(pushToast({ tone: "success", title: `${data.websiteName} uses the default details again` }));
        } catch (e) {
          reportError(dispatch, e, "Couldn’t reset to default");
        }
      },
    }),
  }),
});

export const { useGetContactDetailsQuery, useSaveContactDetailsMutation, useResetContactDetailsMutation } = contactApi;
