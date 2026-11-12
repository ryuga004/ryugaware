import { baseApi } from "@/lib/api/baseApi";
import { reportError, unwrap } from "@/lib/api/helpers";
import { isApiError } from "@/lib/api/types";
import { pushToast } from "@/features/ui/slice";
import type { AuthScope, AuthScopeResponse, AuthSettingsInput, GoogleTestInput, GoogleTestResult } from "./types";

type Dispatch = (a: unknown) => unknown;

/** Saving one scope changes what the others show (inherited values, the overrides list): mark the other cached scopes stale. */
function invalidateOtherScopes(dispatch: Dispatch, getState: () => unknown, scope: AuthScope) {
  const others = customerAuthApi.util.selectCachedArgsForQuery(getState() as never, "getCustomerAuth").filter((s) => s !== scope);
  if (others.length) dispatch(customerAuthApi.util.invalidateTags(others.map((id) => ({ type: "AuthConfig" as const, id }))));
}

export const customerAuthApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCustomerAuth: build.query<AuthScopeResponse, AuthScope>({
      query: (scope) => ({ url: "/customer-auth", params: { scope } }),
      transformResponse: unwrap<AuthScopeResponse>,
      providesTags: (_r, _e, scope) => [{ type: "AuthConfig", id: scope }],
    }),

    saveCustomerAuth: build.mutation<AuthScopeResponse, { scope: AuthScope; input: AuthSettingsInput }>({
      query: ({ scope, input }) => ({ url: `/customer-auth/${scope}`, method: "PUT", body: input }),
      transformResponse: unwrap<AuthScopeResponse>,
      async onQueryStarted({ scope }, { dispatch, getState, queryFulfilled }) {
        const wasInherited = customerAuthApi.endpoints.getCustomerAuth.select(scope)(getState() as never).data?.inherited;
        try {
          const { data } = await queryFulfilled;
          dispatch(customerAuthApi.util.upsertQueryData("getCustomerAuth", scope, data));
          invalidateOtherScopes(dispatch, getState, scope);
          const title = data.websiteName
            ? wasInherited
              ? `${data.websiteName} now has its own sign-in settings`
              : `Sign-in settings saved for ${data.websiteName}`
            : "Default sign-in settings saved";
          dispatch(pushToast({ tone: "success", title }));
        } catch (e) {
          // 400s without field errors (e.g. no method left on) are shown inline by the form.
          const error = (e as { error?: unknown }).error;
          if (isApiError(error) && error.status === 400) return;
          reportError(dispatch, e, "Couldn’t save sign-in settings");
        }
      },
    }),

    resetCustomerAuth: build.mutation<AuthScopeResponse, AuthScope>({
      query: (scope) => ({ url: `/customer-auth/${scope}`, method: "DELETE" }),
      transformResponse: unwrap<AuthScopeResponse>,
      async onQueryStarted(scope, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(customerAuthApi.util.upsertQueryData("getCustomerAuth", scope, data));
          invalidateOtherScopes(dispatch, getState, scope);
          dispatch(pushToast({ tone: "success", title: `${data.websiteName} uses the default settings again` }));
        } catch (e) {
          reportError(dispatch, e, "Couldn’t reset to default");
        }
      },
    }),

    /** Simulated OAuth round trip with the values in the form. */
    testGoogleSignIn: build.mutation<GoogleTestResult, GoogleTestInput>({
      query: (body) => ({ url: "/customer-auth/google/test", method: "POST", body }),
      transformResponse: unwrap<GoogleTestResult>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (e) {
          reportError(dispatch, e, "Couldn’t run the test");
        }
      },
    }),
  }),
});

export const { useGetCustomerAuthQuery, useSaveCustomerAuthMutation, useResetCustomerAuthMutation, useTestGoogleSignInMutation } = customerAuthApi;
