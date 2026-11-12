"use client";

import { Monitor, Smartphone } from "lucide-react";
import { DataTable, type Column } from "@/components/platform/DataTable";
import { ErrorState } from "@/components/platform/ErrorState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { useGetSessionsQuery, useSignOutOtherSessionsMutation, useSignOutSessionMutation } from "../api";
import type { Session } from "../types";

export function SessionsTable() {
  const { data, isLoading, isError, isFetching, refetch } = useGetSessionsQuery();
  const [signOut, { isLoading: signingOut, originalArgs }] = useSignOutSessionMutation();
  const [signOutOthers, { isLoading: signingOutOthers }] = useSignOutOtherSessionsMutation();

  const columns: Column<Session>[] = [
    {
      key: "device",
      header: "Device",
      cell: (s) => (
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-subtle text-ink-700">
            {s.deviceType === "mobile" ? <Smartphone className="size-4" aria-hidden /> : <Monitor className="size-4" aria-hidden />}
          </span>
          <div>
            <p className="font-medium text-ink">{s.device}</p>
            <p className="text-xs text-muted">{s.ip}</p>
          </div>
        </div>
      ),
    },
    { key: "location", header: "Location", cell: (s) => s.location },
    { key: "active", header: "Last active", cell: (s) => (s.current ? "Active now" : formatDateTime(s.lastActiveAt)), className: "tabular-nums whitespace-nowrap" },
    {
      key: "action",
      header: <span className="sr-only">Action</span>,
      align: "right",
      cell: (s) =>
        s.current ? (
          <Badge>This device</Badge>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => signOut(s.id)} loading={signingOut && originalArgs === s.id} aria-label={`Sign out ${s.device}`}>
            Sign out
          </Button>
        ),
    },
  ];

  if (isError) return <ErrorState title="Couldn’t load sessions" onRetry={refetch} retrying={isFetching} compact />;

  const others = (data ?? []).filter((s) => !s.current).length;

  return (
    <div className="space-y-4">
      <DataTable caption="Active sessions" columns={columns} rows={data} getRowId={(s) => s.id} loading={isLoading} skeletonRows={3} />
      <Button variant="secondary" onClick={() => signOutOthers()} loading={signingOutOthers} disabled={others === 0}>
        Sign out of all other sessions
      </Button>
    </div>
  );
}
