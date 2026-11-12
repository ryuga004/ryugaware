import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { templatesApi } from "./api";
import type { TemplateCategory, TemplateCategoryCount, TemplateFilters } from "./types";

interface TemplatesState {
  filters: TemplateFilters;
  /** Template currently shown in the preview dialog. */
  previewId: string | null;
  /** Category tab counts from the latest list response (stable across filtering). */
  categories: TemplateCategoryCount[];
}

export const DEFAULT_TEMPLATE_FILTERS: TemplateFilters = { search: "", category: "all", page: 1, pageSize: 6 };

const initialState: TemplatesState = { filters: DEFAULT_TEMPLATE_FILTERS, previewId: null, categories: [] };

const templatesSlice = createSlice({
  name: "templates",
  initialState,
  reducers: {
    setTemplateSearch(state, a: PayloadAction<string>) {
      state.filters.search = a.payload;
      state.filters.page = 1;
    },
    setTemplateCategory(state, a: PayloadAction<TemplateCategory | "all">) {
      state.filters.category = a.payload;
      state.filters.page = 1;
    },
    setTemplatePage(state, a: PayloadAction<number>) {
      state.filters.page = a.payload;
    },
    clearTemplateFilters() {
      return { ...initialState, categories: [] };
    },
    openTemplatePreview(state, a: PayloadAction<string>) {
      state.previewId = a.payload;
    },
    closeTemplatePreview(state) {
      state.previewId = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(templatesApi.endpoints.getTemplates.matchFulfilled, (state, { payload }) => {
      state.categories = payload.meta.categories;
      if (payload.meta.page !== state.filters.page) state.filters.page = payload.meta.page;
    });
  },
  selectors: {
    selectTemplateFilters: (s) => s.filters,
    selectTemplateCategories: (s) => s.categories,
    selectPreviewId: (s) => s.previewId,
  },
});

export const {
  setTemplateSearch,
  setTemplateCategory,
  setTemplatePage,
  clearTemplateFilters,
  openTemplatePreview,
  closeTemplatePreview,
} = templatesSlice.actions;
export const { selectTemplateFilters, selectTemplateCategories, selectPreviewId } = templatesSlice.selectors;
export default templatesSlice.reducer;
