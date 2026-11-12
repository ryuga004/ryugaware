import { baseApi } from "@/lib/api/baseApi";
import { reportError, unwrap } from "@/lib/api/helpers";
import { pushToast } from "@/features/ui/slice";
import type { AddDomainInput, Domain, DomainDetail, DomainFilters, DomainsResponse } from "./types";

const LIST = { type: "Domain" as const, id: "LIST" };

export const domainsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDomains: build.query<DomainsResponse, DomainFilters>({
      query: (f) => ({
        url: "/domains",
        params: { search: f.search || undefined, status: f.status, websiteId: f.websiteId, page: f.page, pageSize: f.pageSize },
      }),
      providesTags: (res) => [LIST, ...(res?.data ?? []).map((d) => ({ type: "Domain" as const, id: d.id }))],
    }),

    getDomain: build.query<DomainDetail, string>({
      query: (id) => `/domains/${id}`,
      transformResponse: unwrap<DomainDetail>,
      providesTags: (_r, _e, id) => [{ type: "Domain", id }],
    }),

    addDomain: build.mutation<DomainDetail, AddDomainInput>({
      query: (body) => ({ url: "/domains", method: "POST", body }),
      transformResponse: unwrap<DomainDetail>,
      invalidatesTags: [LIST],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Seed the detail cache so the DNS drawer opens instantly.
          dispatch(domainsApi.util.upsertQueryData("getDomain", data.id, data));
          dispatch(pushToast({ tone: "success", title: `${data.hostname} added`, description: "Add the DNS records below to connect it." }));
        } catch (e) {
          reportError(dispatch, e, "Couldn’t add domain");
        }
      },
    }),

    verifyDomain: build.mutation<DomainDetail, string>({
      query: (id) => ({ url: `/domains/${id}/verify`, method: "POST" }),
      transformResponse: unwrap<DomainDetail>,
      // Status changes can move the row between filters and change counts, so refetch lists.
      invalidatesTags: (_r, _e, id) => [{ type: "Domain", id }, LIST, { type: "Website", id: "LIST" }, "WebsiteOptions"],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(domainsApi.util.upsertQueryData("getDomain", id, data));
          const msg =
            data.status === "active"
              ? { tone: "success" as const, title: `${data.hostname} is connected`, description: "SSL certificate issued." }
              : { tone: "info" as const, title: "DNS records found", description: "We’re issuing the SSL certificate. Check again in a minute." };
          dispatch(pushToast(msg));
        } catch (e) {
          reportError(dispatch, e, "Couldn’t verify domain");
        }
      },
    }),

    makePrimaryDomain: build.mutation<DomainDetail, string>({
      query: (id) => ({ url: `/domains/${id}`, method: "PATCH", body: { primary: true } }),
      transformResponse: unwrap<DomainDetail>,
      invalidatesTags: [LIST, { type: "Website", id: "LIST" }, "WebsiteOptions"],
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        // Optimistic: flip the primary flag for that website in every cached list.
        const args = domainsApi.util.selectCachedArgsForQuery(getState() as never, "getDomains");
        let websiteId: string | undefined;
        const patches = args.map((arg) =>
          dispatch(
            domainsApi.util.updateQueryData("getDomains", arg, (draft) => {
              websiteId ??= draft.data.find((d) => d.id === id)?.websiteId;
              for (const d of draft.data) if (d.websiteId === websiteId) d.primary = d.id === id;
            }),
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: `${data.hostname} is now primary`, description: `${data.websiteName} redirects here.` }));
        } catch (e) {
          patches.forEach((p) => p.undo());
          reportError(dispatch, e, "Couldn’t change the primary domain");
        }
      },
    }),

    removeDomain: build.mutation<{ id: string; hostname: string }, string>({
      query: (id) => ({ url: `/domains/${id}`, method: "DELETE" }),
      transformResponse: unwrap<{ id: string; hostname: string }>,
      invalidatesTags: (_r, _e, id) => [{ type: "Domain", id }, LIST, { type: "Website", id: "LIST" }, "WebsiteOptions"],
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        const args = domainsApi.util.selectCachedArgsForQuery(getState() as never, "getDomains");
        const patches = args.map((arg) =>
          dispatch(
            domainsApi.util.updateQueryData("getDomains", arg, (draft) => {
              const before = draft.data.length;
              draft.data = draft.data.filter((d: Domain) => d.id !== id);
              if (draft.data.length !== before) draft.meta.total = Math.max(0, draft.meta.total - 1);
            }),
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(pushToast({ tone: "success", title: `${data.hostname} removed` }));
        } catch (e) {
          patches.forEach((p) => p.undo());
          reportError(dispatch, e, "Couldn’t remove domain");
        }
      },
    }),
  }),
});

export const {
  useGetDomainsQuery,
  useGetDomainQuery,
  useAddDomainMutation,
  useVerifyDomainMutation,
  useMakePrimaryDomainMutation,
  useRemoveDomainMutation,
} = domainsApi;
