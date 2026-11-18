import { baseApi } from "@/lib/api/baseApi";
import { getErrorMessage, type Single } from "@/lib/api/types";
import { pushToast } from "@/features/ui/slice";
import { clearPendingRegistration, loggedOut, setPendingEmail, startResendCooldown } from "./slice";
import type { AuthUser, LoginInput, RegisterInput, SessionInfo } from "./types";

const unwrap = <T,>(res: Single<T>) => res.data;

/** Matches AUTH_OTP_RESEND_COOLDOWN on the backend. */
const COOLDOWN_MS = 60_000;

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSession: build.query<SessionInfo, void>({
      query: () => "/auth/me",
      transformResponse: unwrap<SessionInfo>,
      providesTags: ["Auth"],
    }),

    login: build.mutation<{ authenticated: boolean; user: AuthUser }, LoginInput>({
      query: (body) => ({ url: "/auth/sessions", method: "POST", body }),
      transformResponse: unwrap<{ authenticated: boolean; user: AuthUser }>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Login returns a trimmed user; /auth/me is the full record the dashboard reads.
          dispatch(authApi.endpoints.getSession.initiate(undefined, { forceRefetch: true }));
        } catch {
          /* the form renders the error */
        }
      },
    }),

    logout: build.mutation<{ loggedOut: boolean }, void>({
      query: () => ({ url: "/auth/sessions/current", method: "DELETE" }),
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

    /** Step 1 of registration: prove the address exists before any record is created. */
    requestEmailOtp: build.mutation<{ sent: boolean }, { email: string }>({
      query: (body) => ({ url: "/auth/email-verification/otp", method: "POST", body }),
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

    resendEmailOtp: build.mutation<{ sent: boolean }, { email: string }>({
      query: (body) => ({ url: "/auth/email-verification/resend", method: "POST", body }),
      transformResponse: unwrap<{ sent: boolean }>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(startResendCooldown(Date.now() + COOLDOWN_MS));
          dispatch(pushToast({ tone: "success", title: "New code sent" }));
        } catch (e) {
          dispatch(pushToast({ tone: "error", title: "Couldn’t send the code", description: getErrorMessage((e as { error?: unknown }).error) }));
        }
      },
    }),

    /** Step 2: exchange the code for a short-lived registration token. */
    verifyEmailOtp: build.mutation<{ verified: boolean; registrationToken: string }, { email: string; otp: string }>({
      query: (body) => ({ url: "/auth/email-verification/verify", method: "POST", body }),
      transformResponse: unwrap<{ verified: boolean; registrationToken: string }>,
    }),

    /** Step 3: create the organization and its first admin user. */
    register: build.mutation<{ registered: boolean; email: string; orgName: string }, RegisterInput>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      transformResponse: unwrap<{ registered: boolean; email: string; orgName: string }>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clearPendingRegistration());
        } catch {
          /* the verify screen renders the error */
        }
      },
    }),

    forgotPassword: build.mutation<{ sent: boolean }, { email: string }>({
      query: (body) => ({ url: "/auth/password/forgot", method: "POST", body }),
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

    validateResetToken: build.query<{ valid: boolean }, string>({
      query: (token) => ({ url: "/auth/password/reset/validate", params: { token } }),
      transformResponse: unwrap<{ valid: boolean }>,
    }),

    resetPassword: build.mutation<{ reset: boolean }, { token: string; newPassword: string }>({
      query: (body) => ({ url: "/auth/password/reset", method: "POST", body }),
      transformResponse: unwrap<{ reset: boolean }>,
    }),
  }),
});

export const {
  useGetSessionQuery,
  useLoginMutation,
  useLogoutMutation,
  useRequestEmailOtpMutation,
  useResendEmailOtpMutation,
  useVerifyEmailOtpMutation,
  useRegisterMutation,
  useForgotPasswordMutation,
  useValidateResetTokenQuery,
  useResetPasswordMutation,
} = authApi;
