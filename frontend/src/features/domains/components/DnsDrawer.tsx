"use client";

import { CircleCheck, CircleDashed, RefreshCw, Star, Trash2 } from "lucide-react";
import { Alert } from "@/components/platform/Alert";
import { CopyButton } from "@/components/platform/CopyButton";
import { Drawer } from "@/components/platform/Drawer";
import { ErrorState } from "@/components/platform/ErrorState";
import { DescriptionList } from "@/components/platform/SettingsSection";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetDomainQuery, useMakePrimaryDomainMutation, useVerifyDomainMutation } from "../api";
import { DOMAIN_STATUS, SSL_STATUS } from "../constants";
import { closeDomainDrawer, requestRemoveDomain, selectDomainDrawer } from "../slice";

export function DnsDrawer() {
  const drawer = useAppSelector(selectDomainDrawer);
  if (drawer.mode !== "dns") return null;
  return <DnsDrawerBody domainId={drawer.domainId} />;
}

function DnsDrawerBody({ domainId }: { domainId: string }) {
  const dispatch = useAppDispatch();
  const { data: d, isLoading, isError, refetch, isFetching } = useGetDomainQuery(domainId);
  const [verify, { isLoading: verifying }] = useVerifyDomainMutation();
  const [makePrimary, { isLoading: settingPrimary }] = useMakePrimaryDomainMutation();

  return (
    <Drawer
      open
      onClose={() => dispatch(closeDomainDrawer())}
      title={d?.hostname ?? "Domain"}
      description={d ? `Connected to ${d.websiteName}` : undefined}
      footer={
        d && (
          <>
            <Button variant="dangerGhost" leftIcon={<Trash2 className="size-4" />} onClick={() => dispatch(requestRemoveDomain(d.id))} className="mr-auto max-sm:hidden">
              Remove
            </Button>
            {d.status === "active" ? (
              !d.primary && (
                <Button variant="secondary" leftIcon={<Star className="size-4" />} loading={settingPrimary} onClick={() => makePrimary(d.id)}>
                  Make primary
                </Button>
              )
            ) : (
              <Button leftIcon={<RefreshCw className="size-4" />} loading={verifying} onClick={() => verify(d.id)}>
                {d.status === "verifying" ? "Check again" : "Verify now"}
              </Button>
            )}
            <Button variant="secondary" onClick={() => dispatch(closeDomainDrawer())}>
              Done
            </Button>
          </>
        )
      }
    >
      {isError ? (
        <ErrorState compact className="border-0" title="Couldn’t load this domain" onRetry={refetch} retrying={isFetching} />
      ) : isLoading || !d ? (
        <div className="space-y-4">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {d.status === "failed" && d.failureReason && <Alert tone="error">{d.failureReason} Update the record below, then verify again.</Alert>}
          {d.status === "pending_dns" && <Alert tone="warning">Add these records at your domain provider (GoDaddy, Namecheap, Cloudflare…). Changes can take up to 24 hours.</Alert>}
          {d.status === "verifying" && <Alert tone="info">We found your records and are issuing the SSL certificate. This usually takes a few minutes.</Alert>}

          <DescriptionList
            items={[
              {
                label: "Status",
                value: (
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={d.status} map={DOMAIN_STATUS} />
                    {d.primary && <Badge tone="ink">Primary</Badge>}
                  </span>
                ),
              },
              { label: "SSL certificate", value: <StatusBadge value={d.ssl} map={SSL_STATUS} /> },
              { label: "Last checked", value: <span className="tabular-nums">{d.lastCheckedAt ? formatDateTime(d.lastCheckedAt) : "Not checked yet"}</span> },
            ]}
          />

          <section>
            <h3 className="font-heading mb-3 text-base font-semibold">DNS records</h3>
            <ul className="flex flex-col gap-3">
              {d.records.map((r) => (
                <li key={r.type + r.host} className="rounded-card border border-line p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <Badge tone="neutral" className="font-mono">{r.type}</Badge>
                    <span className={r.found ? "flex items-center gap-1.5 text-xs font-medium text-success" : "flex items-center gap-1.5 text-xs font-medium text-muted"}>
                      {r.found ? <CircleCheck className="size-4" aria-hidden /> : <CircleDashed className="size-4" aria-hidden />}
                      {r.found ? "Found" : "Not found yet"}
                    </span>
                  </div>
                  <dl className="grid gap-2 text-sm">
                    {[
                      ["Name / host", r.host],
                      ["Value / points to", r.value],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center gap-2">
                        <dt className="w-32 shrink-0 text-xs text-muted">{label}</dt>
                        <dd className="flex min-w-0 flex-1 items-center gap-1 rounded-md bg-subtle py-0.5 pr-0.5 pl-2.5">
                          <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink">{value}</code>
                          <CopyButton value={value!} label={`Copy ${label?.toLowerCase()}`} size="sm" />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Set TTL to the lowest value your provider allows (or “Auto”).</p>
          </section>

          <Button variant="dangerGhost" leftIcon={<Trash2 className="size-4" />} onClick={() => dispatch(requestRemoveDomain(d.id))} className="self-start sm:hidden">
            Remove domain
          </Button>
        </div>
      )}
    </Drawer>
  );
}
