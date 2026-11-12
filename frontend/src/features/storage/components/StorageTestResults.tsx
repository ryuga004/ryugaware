"use client";

import { CircleCheck, CircleMinus, CircleX, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { StorageTestResult, StorageTestStepStatus } from "../types";

const ICON: Record<StorageTestStepStatus, React.ReactNode> = {
  passed: <CircleCheck className="size-5 text-success" aria-hidden />,
  failed: <CircleX className="size-5 text-danger" aria-hidden />,
  skipped: <CircleMinus className="size-5 text-faint" aria-hidden />,
};

const STATUS_TEXT: Record<StorageTestStepStatus, string> = { passed: "Passed", failed: "Failed", skipped: "Skipped" };

/** Step-by-step result of a connection check. */
export function StorageTestResults({ result, onDismiss }: { result: StorageTestResult; onDismiss?: () => void }) {
  return (
    <section aria-labelledby="storage-test-title" className="rounded-card border border-line bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="storage-test-title" className="font-heading text-base font-semibold text-ink">
              Test results
            </h2>
            <Badge tone={result.ok ? "success" : "danger"}>{result.ok ? "All checks passed" : "Check failed"}</Badge>
          </div>
          <p className="mt-0.5 text-xs break-all text-muted">
            {result.saved ? "Saved settings" : "Unsaved settings"} · {result.bucket} · {formatDateTime(result.testedAt)}
          </p>
        </div>
        {onDismiss && (
          <IconButton label="Dismiss test results" onClick={onDismiss}>
            <X className="size-4" />
          </IconButton>
        )}
      </div>
      <ol className="divide-y divide-line">
        {result.steps.map((s) => (
          <li key={s.key} className="flex items-start gap-3 px-5 py-3">
            <span className="mt-px shrink-0">{ICON[s.status]}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:gap-4">
              <p className="text-sm font-medium text-ink sm:w-44 sm:shrink-0">
                {s.label}
                <span className="sr-only"> – {STATUS_TEXT[s.status]}</span>
              </p>
              <p className={cn("min-w-0 text-sm break-words", s.status === "failed" ? "text-danger-hover" : "text-muted")}>{s.message}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
