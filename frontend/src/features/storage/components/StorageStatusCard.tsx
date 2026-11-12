"use client";

import { CircleAlert, CircleCheck, RefreshCw } from "lucide-react";
import { StatTile } from "@/components/platform/StatTile";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { useTestStorageConnectionMutation } from "../api";
import { PROVIDER_LABEL } from "../constants";
import { formatBytes } from "../format";
import type { StorageConfig } from "../types";

/** Connected / failed banner with a "Test connection" for the saved settings, plus usage tiles. */
export function StorageStatusCard({ config }: { config: StorageConfig }) {
  const [test, { isLoading }] = useTestStorageConnectionMutation();
  const ok = config.status === "connected";
  const testedAt = config.lastTest?.testedAt;
  const where = config.region === "auto" ? config.endpoint.replace("https://", "") : config.region;

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          "flex flex-col gap-4 rounded-card border p-5 sm:flex-row sm:items-center",
          ok ? "border-success-border bg-success-bg" : "border-danger-border bg-danger-bg",
        )}
      >
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full bg-surface", ok ? "text-success" : "text-danger")}>
          {ok ? <CircleCheck className="size-6" aria-hidden /> : <CircleAlert className="size-6" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("font-heading text-base font-semibold", ok ? "text-success" : "text-danger-hover")}>{ok ? "Connected" : "Connection failed"}</p>
          <p className={cn("mt-0.5 text-sm break-words", ok ? "text-body" : "text-danger-hover")}>
            <span className="font-medium break-all">{config.bucket}</span> · {where} · {ok ? "Verified" : "Last attempt"} {formatDateTime(testedAt)}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {ok
              ? `${PROVIDER_LABEL[config.provider]} · connected ${formatDate(config.connectedAt)}`
              : "Uploads keep going to Ryugaware storage until the check passes. Fix the settings below and test again."}
          </p>
        </div>
        <Button variant="secondary" leftIcon={<RefreshCw className="size-4" />} onClick={() => test({})} loading={isLoading} className="max-sm:w-full">
          {isLoading ? "Testing…" : "Test connection"}
        </Button>
      </div>

      {ok && config.usage && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Storage used" value={formatBytes(config.usage.bytesUsed)} sub="In your bucket" />
          <StatTile label="Files" value={formatNumber(config.usage.objects)} sub="Images, documents and exports" />
          <StatTile
            label="Last upload"
            value={config.usage.lastUploadAt ? formatDateTime(config.usage.lastUploadAt).replace(" UTC", "") : "No uploads yet"}
            sub={config.usage.lastUploadLabel ?? "New uploads will appear here"}
          />
        </div>
      )}
    </div>
  );
}
