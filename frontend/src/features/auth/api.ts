import { baseApi } from "@/lib/api/baseApi";
import { getErrorMessage, type Single } from "@/lib/api/types";
import { pushToast } from "@/features/ui/slice";
import { loggedOut, setPendingEmail, startResendCooldown } from "./slice";
import type { AuthUser, LoginInput, RegisterInput, SessionInfo, TokenCheck } from "./types";

const unwrap = <T,>(res: Single<T>) => res.data;
const COOLDOWN_MS = 60_000;

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSession: build.query<SessionInfo, void>({
      query: () => "/auth/session",
      transformResponse: unwrap<SessionInfo>,
      providesTags: ["Auth"],
    }),

    login: build.mutation<{ user: AuthUser }, LoginInput>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      transformResponse: unwrap<{ user: AuthUser }>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Make the guard see the new session immediately, without another round-trip.
          dispatch(authApi.util.upsertQueryData("getSession", undefined, { authenticated: true, user: data.user }));
        } catch {
          /* the form renders the error */
        }
      },
    }),

    logout: build.mutation<{ loggedOut: boolean }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      transformResponse: unwrap<{ loggedOut: boolean }>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(loggedOut()); // root reducer resets every client slice
          dispatch(baseApi.util.resetApiState()); // drop all cached private data
          dispatch(authApi.util.upsertQueryData("getSession", undefined, { authenticated: false, user: null }));
        } catch (e) {
          dispatch(pushToast({ tone: "error", title: "Couldn’t log out", description: getErrorMessage((e as { error?: unknown }).error) }));
        }
      },
    }),

    register: build.mutation<{ email: string }, RegisterInput>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      transformResponse: unwrap<{ email: string }>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setPendingEmail(data.email));
          dispatch(startResendCooldown(Date.now() + COOLDOWN_MS));
        } catch {
          /* field errors are shown by the form */
        }
      },
    }),

    resendVerification: build.mutation<{ sent: boolean }, { email: string }>({
      query: (body) => ({ url: "/auth/resend-verification", method: "POST", body }),
      transformResponse: unwrap<{ sent: boolean }>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(startResendCooldown(Date.now() + COOLDOWN_MS));
          dispatch(pushToast({ tone: "success", title: "Verification email sent" }));
        } catch (e) {
          dispatch(pushToast({ tone: "error", title: "Couldn’t send email", description: getErrorMessage((e as { error?: unknown }).error) }));
        }
      },
    }),

    verifyEmail: build.mutation<{ verified: boolean; email: string | null }, { token: string; email?: string }>({
      query: (body) => ({ url: "/auth/verify-email", method: "POST", body }),
      transformResponse: unwrap<{ verified: boolean; email: string | null }>,
    }),

    forgotPassword: build.mutation<{ sent: boolean }, { email: string }>({
      query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }),
      transformResponse: unwrap<{ sent: boolean }>,
      async onQueryStarted({ email }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(setPendingEmail(email));
          dispatch(startResendCooldown(Date.now() + COOLDOWN_MS));
        } catch {
          /* field errors are shown by the form */
        }
      },
    }),

    validateResetToken: build.query<TokenCheck, string>({
      query: (token) => ({ url: "/auth/reset-password/validate", params: { token } }),
      transformResponse: unwrap<TokenCheck>,
    }),

    resetPassword: build.mutation<{ reset: boolean }, { token: string; password: string }>({
      query: (body) => ({ url: "/auth/reset-password", method: "POST", body }),
      transformResponse: unwrap<{ reset: boolean }>,
    }),
  }),
});

export const {
  useGetSessionQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useResendVerificationMutation,
  useVerifyEmailMutation,
  useForgotPasswordMutation,
  useValidateResetTokenQuery,
  useResetPasswordMutation,
} = authApi;
