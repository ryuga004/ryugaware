import { baseApi } from "@/lib/api/baseApi";
import { getErrorMessage, isApiError, type Single } from "@/lib/api/types";
import { pushToast } from "@/features/ui/slice";
import type {
  CreateWebsiteInput,
  SubdomainCheck,
  UpdateWebsiteInput,
  Website,
  WebsiteFilters,
  WebsiteOption,
  WebsitesResponse,
} from "./types";

const unwrap = <T,>(res: Single<T>) => res.data;
const LIST = { type: "Website" as const, id: "LIST" };

/** Shows an error toast unless the failure is a field-level validation error the form already displays. */
function reportError(dispatch: (a: ReturnType<typeof pushToast>) => unknown, error: unknown, title: string) {
  if (isApiError(error) && error.data.fieldErrors) return;
  dispatch(pushToast({ tone: "error", title, description: getErrorMessage(error) }));
}

export const websitesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWebsites: build.query<WebsitesResponse, WebsiteFilters>({
      query: (f) => ({
        url: "/websites",
        params: { search: f.search || undefined, status: f.status, type: f.type, page: f.page, pageSize: f.pageSize },
      }),
      providesTags: (res) => [LIST, ...(res?.data ?? []).map((w) => ({ type: "Website" as const, id: w.id }))],
    }),

    getWebsite: build.query<Website, string>({
      query: (id) => `/websites/${id}`,
      transformResponse: unwrap<Website>,
      providesTags: (_r, _e, id) => [{ type: "Website", id }],
    }),

    /** id / name / host of every website, for pickers in other sections. */
    getWebsiteOptions: build.query<WebsiteOption[], void>({
      query: () => "/websites/options",
      transformResponse: unwrap<WebsiteOption[]>,
      providesTags: ["WebsiteOptions"],
    }),

    checkSubdomain: build.query<SubdomainCheck, string>({
      query: (subdomain) => ({ url: "/websites/check-subdomain", params: { subdomain } }),
      transformResponse: unwrap<SubdomainCheck>,
      keepUnusedDataFor: 30,
    }),

    createWebsite: build.mutation<Website, CreateWebsiteInput>({
      query: (body) => ({ url: "/websites", method: "POST", body }),
      transformResponse: unwrap<Website>,
      invalidatesTags: [LIST, "License", "WebsiteOptions"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            pushToast({
              tone: "success",
              title: `${data.name} created`,
              description: data.url.replace("https://", ""),
              action: { label: "Open admin", href: `/websites?admin=${data.id}` },
            }),
          );
        } catch (e) {
          reportError(dispatch, (e as { error?: unknown }).error, "Couldn’t create website");
        }
      },
    }),

    updateWebsite: build.mutation<Website, { id: string; patch: UpdateWebsiteInput }>({
      query: ({ id, patch }) => ({ url: `/websites/${id}`, method: "PATCH", body: patch }),
      transformResponse: unwrap<Website>,
      invalidatesTags: (_r, _e, { id }) => [{ type: "Website", id }, LIST, "WebsiteOptions"],
      async onQueryStarted({ id }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Patch every cached list + detail entry immediately; tag invalidation then refreshes counts.
          dispatch(websitesApi.util.updateQueryData("getWebsite", id, () => data));
          const args = websitesApi.util.selectCachedArgsForQuery(getState() as never, "getWebsites");
          for (const arg of args) {
            dispatch(
              websitesApi.util.updateQueryData("getWebsites", arg, (draft) => {
                const i = draft.data.findIndex((w) => w.id === id);
                if (i >= 0) draft.data[i] = data;
              }),
            );
          }
          dispatch(pushToast({ tone: "success", title: "Changes saved", description: data.name }));
        } catch (e) {
          reportError(dispatch, (e as { error?: unknown }).error, "Couldn’t save changes");
        }
      },
    }),

    deleteWebsite: build.mutation<{ id: string; name: string; deleted: boolean }, string>({
      query: (id) => ({ url: `/websites/${id}`, method: "DELETE" }),
      transformResponse: unwrap<{ id: string; name: string; deleted: boolean }>,
      invalidatesTags: (_r, _e, id) => [{ type: "Website", id }, LIST, "License", "WebsiteOptions"],
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        // Optimistic removal from every cached list; rolled back if the request fails.
        const args = websitesApi.util.selectCachedArgsForQuery(getState() as never, "getWebsites");
        const patches = args.map((arg) =>
          dispatch(
            websitesApi.util.updateQueryData("getWebsites", arg, (draft) => {
              draft.data = draft.data.filter((w) => w.id !== id);
              draft.meta.total = Math.max(0, draft.meta.total - 1);
              draft.meta.counts.all = Math.max(0, draft.meta.counts.all - 1);
            }),
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: `${data.name} deleted` }));
        } catch (e) {
          patches.forEach((p) => p.undo());
          reportError(dispatch, (e as { error?: unknown }).error, "Couldn’t delete website");
        }
      },
    }),
  }),
});

export const {
  useGetWebsitesQuery,
  useGetWebsiteQuery,
  useGetWebsiteOptionsQuery,
  useLazyCheckSubdomainQuery,
  useCreateWebsiteMutation,
  useUpdateWebsiteMutation,
  useDeleteWebsiteMutation,
} = websitesApi;
