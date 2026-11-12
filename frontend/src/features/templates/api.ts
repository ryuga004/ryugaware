import { baseApi } from "@/lib/api/baseApi";
import type { Single } from "@/lib/api/types";
import type { Template, TemplateFilters, TemplatesResponse } from "./types";

export const templatesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTemplates: build.query<TemplatesResponse, Partial<TemplateFilters> | void>({
      query: (f) => ({
        url: "/templates",
        params: { search: f?.search || undefined, category: f?.category, page: f?.page, pageSize: f?.pageSize },
      }),
      providesTags: (res) => [
        { type: "Template" as const, id: "LIST" },
        ...(res?.data ?? []).map((t) => ({ type: "Template" as const, id: t.id })),
      ],
    }),
    getTemplate: build.query<Template, string>({
      query: (id) => `/templates/${id}`,
      transformResponse: (res: Single<Template>) => res.data,
      providesTags: (_r, _e, id) => [{ type: "Template", id }],
    }),
  }),
});

export const { useGetTemplatesQuery, useGetTemplateQuery } = templatesApi;
