"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { USE_DUMMY_API } from "@/lib/api/config";
import { baseApi } from "@/lib/api/baseApi";
import { db } from "@/lib/api/dummy/db";
import { getScenario, SCENARIOS, setScenario, type DataScenario } from "@/lib/api/dummy/scenario";
import { pushToast } from "@/features/ui/slice";
import { cn } from "@/lib/cn";
import { useAppDispatch } from "@/store/hooks";

/**
 * Dummy-API only: swaps the demo data set (Normal / Empty / Small / Large) for the store sections, so
 * empty, short and very long states can be reviewed. Resets the in-memory db and the RTK Query cache.
 */
export function DemoDataSwitcher({ dark, className }: { dark?: boolean; className?: string }) {
  const dispatch = useAppDispatch();
  // The app shell only renders after the client-side session check, so reading sessionStorage here is safe.
  const [scenario, setLocal] = useState<DataScenario>(() => getScenario());

  if (!USE_DUMMY_API) return null;

  const change = (value: DataScenario) => {
    setScenario(value);
    setLocal(value);
    db.reset();
    dispatch(baseApi.util.resetApiState());
    const s = SCENARIOS.find((x) => x.value === value)!;
    dispatch(pushToast({ tone: "info", title: `Demo data: ${s.label}`, description: s.hint }));
  };

  return (
    <label className={cn("flex items-center gap-2 text-xs", dark ? "text-on-dark" : "text-muted", className)}>
      <FlaskConical className="size-4 shrink-0" aria-hidden />
      <span className="shrink-0">Demo data</span>
      <select
        value={scenario}
        onChange={(e) => change(e.target.value as DataScenario)}
        suppressHydrationWarning
        className={cn(
          "h-7 min-w-0 flex-1 rounded-md border px-1.5 text-xs outline-none focus:ring-2 focus:ring-ember/40",
          dark ? "border-ink-700 bg-ink-800 text-page" : "border-line-strong bg-surface text-ink",
        )}
      >
        {SCENARIOS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
