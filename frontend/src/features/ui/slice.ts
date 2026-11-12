import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

interface UiState {
  toasts: Toast[];
  mobileNavOpen: boolean;
}

const initialState: UiState = { toasts: [], mobileNavOpen: false };

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
        if (state.toasts.length > 4) state.toasts.shift();
      },
      prepare(toast: Omit<Toast, "id">) {
        return { payload: { id: nanoid(), ...toast } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    setMobileNavOpen(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
  },
  selectors: {
    selectToasts: (s) => s.toasts,
  },
});

export const { pushToast, dismissToast, setMobileNavOpen } = uiSlice.actions;
export const { selectToasts } = uiSlice.selectors;
export default uiSlice.reducer;
export const uiReducerPath = uiSlice.reducerPath;
