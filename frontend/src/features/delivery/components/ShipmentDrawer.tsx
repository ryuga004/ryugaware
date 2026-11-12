"use client";

import { Check, ExternalLink, X } from "lucide-react";
import { Alert } from "@/components/platform/Alert";
import { CopyButton } from "@/components/platform/CopyButton";
import { Drawer } from "@/components/platform/Drawer";
import { ErrorState } from "@/components/platform/ErrorState";
import { DescriptionList } from "@/components/platform/SettingsSection";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, formatMoney, pluralize } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetShipmentQuery, useUpdateShipmentStatusMutation } from "../api";
import { ACTION_LABEL, SHIPMENT_STATUS, SHIPMENT_TRANSITIONS, eventLabel } from "../constants";
import { closeShipment, requestReturnShipment, selectOpenShipmentId } from "../slice";
import type { ShipmentDetail, ShipmentEventCode } from "../types";
import { DeliveryMark } from "./DeliveryMark";

export function ShipmentDrawer() {
  const id = useAppSelector(selectOpenShipmentId);
  if (!id) return null;
  return <ShipmentDrawerBody key={id} shipmentId={id} />;
}

/** Steps still to come, shown greyed out under the timeline while a shipment is moving. */
function upcoming(s: ShipmentDetail): ShipmentEventCode[] {
  if (s.status === "delivered" || s.status === "returned" || s.status === "failed") return [];
  const path: ShipmentEventCode[] =
    s.methodType === "pickup"
      ? ["placed", "packed", "out_for_delivery", "delivered"]
      : s.methodType === "same_day"
        ? ["placed", "packed", "picked_up", "out_for_delivery", "delivered"]
        : ["placed", "packed", "picked_up", "in_transit", "out_for_delivery", "delivered"];
  const last = s.events.at(-1)?.code;
  const from = last ? path.indexOf(last) + 1 : 0;
  return path.slice(from);
}

function ShipmentDrawerBody({ shipmentId }: { shipmentId: string }) {
  const dispatch = useAppDispatch();
  const { data: s, isLoading, isError, refetch, isFetching } = useGetShipmentQuery(shipmentId);
  const [update, { isLoading: updating, originalArgs }] = useUpdateShipmentStatusMutation();
  const close = () => dispatch(closeShipment());

  const actions = s ? SHIPMENT_TRANSITIONS[s.status] : [];
  const forward = actions.filter((a) => a !== "return");
  const canReturn = actions.includes("return");

  return (
    <Drawer
      open
      onClose={close}
      title={`Shipment ${shipmentId}`}
      description={s ? `Order ${s.orderId} · ${s.websiteName}` : undefined}
      footer={
        s && (
          <>
            {canReturn && (
              <Button variant="dangerGhost" onClick={() => dispatch(requestReturnShipment(s.id))} className="mr-auto" disabled={updating}>
                Mark as returned
              </Button>
            )}
            {forward.map((a) => (
              <Button key={a} loading={updating && originalArgs?.action === a} disabled={updating} onClick={() => update({ id: s.id, action: a })}>
                {ACTION_LABEL[a](s.methodType)}
              </Button>
            ))}
            {forward.length === 0 && (
              <Button variant="secondary" onClick={close}>
                Close
              </Button>
            )}
          </>
        )
      }
    >
      {isError ? (
        <ErrorState compact className="border-0" title="Couldn’t load this shipment" onRetry={refetch} retrying={isFetching} />
      ) : isLoading || !s ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <DeliveryMark type={s.methodType} carrier={s.carrier} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{s.methodName}</p>
              <p className="truncate text-xs text-muted">{s.carrier === "Self" ? "Your own staff" : s.carrier}</p>
            </div>
            <StatusBadge value={s.status} map={SHIPMENT_STATUS} />
          </div>

          {s.status === "failed" && <Alert tone="error">{s.failureReason ?? "The carrier couldn’t deliver this order."} Retry the delivery or mark it as returned.</Alert>}
          {s.status === "returned" && <Alert tone="warning">This order came back to you{s.failureReason ? `: ${s.failureReason.replace(/\.$/, "")}` : ""}. Refund or reship it from the order.</Alert>}

          <DescriptionList
            items={[
              { label: "Customer", value: s.customerName },
              {
                label: "Destination",
                value: (
                  <span className="font-normal">
                    {s.destination.line}, {s.destination.city}, {s.destination.state} {s.destination.pincode}
                  </span>
                ),
              },
              {
                label: "Tracking number",
                value: s.awb ? (
                  <span className="flex items-center gap-1">
                    <code className="font-mono text-sm">{s.awb}</code>
                    <CopyButton value={s.awb} label="Copy tracking number" size="sm" />
                  </span>
                ) : (
                  <span className="font-normal text-muted">{s.methodType === "pickup" ? "Not needed for store pickup" : "Assigned when the carrier picks it up"}</span>
                ),
              },
              s.status === "delivered"
                ? { label: s.methodType === "pickup" ? "Collected" : "Delivered", value: <span className="tabular-nums">{formatDateTime(s.updatedAt)}</span> }
                : { label: "Estimated delivery", value: <span className="tabular-nums">{s.eta ? formatDate(s.eta) : "—"}</span> },
              { label: "Order", value: <span className="tabular-nums">{pluralize(s.itemCount, "item")} · {formatMoney(s.orderTotal)}</span> },
            ]}
          />

          <section aria-labelledby="shipment-progress">
            <h3 id="shipment-progress" className="font-heading mb-4 text-base font-semibold">
              Progress
            </h3>
            <ol className="relative">
              {s.events.map((e, i) => {
                const current = i === s.events.length - 1;
                const bad = e.code === "failed" || e.code === "returned";
                const hasNext = i < s.events.length - 1 || upcoming(s).length > 0;
                return (
                  <li key={`${e.code}-${e.at}`} className="relative flex gap-3 pb-5 last:pb-0">
                    {hasNext && <span aria-hidden className={cn("absolute top-6 bottom-0 left-[11px] w-0.5", current ? "bg-line" : "bg-ink")} />}
                    <span
                      aria-hidden
                      className={cn(
                        "relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-full",
                        current && bad ? "bg-danger text-white" : current && s.status !== "delivered" ? "border-2 border-primary bg-surface" : "bg-ink text-page",
                      )}
                    >
                      {current && bad ? <X className="size-3.5" strokeWidth={3} /> : current && s.status !== "delivered" ? <span className="size-2.5 rounded-full bg-primary" /> : <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className={cn("text-sm font-medium", bad ? "text-danger-hover" : "text-ink")}>{eventLabel(e.code, s.methodType)}</p>
                      <p className={cn("text-xs tabular-nums", current && !bad && s.status !== "delivered" ? "text-warning-text" : "text-muted")}>
                        {formatDateTime(e.at)} · {e.location}
                      </p>
                      {e.note && <p className="mt-1 text-xs text-body">{e.note}</p>}
                    </div>
                  </li>
                );
              })}
              {upcoming(s).map((code, i, list) => (
                <li key={code} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < list.length - 1 && <span aria-hidden className="absolute top-6 bottom-0 left-[11px] w-0.5 bg-line" />}
                  <span aria-hidden className="relative z-[1] size-6 shrink-0 rounded-full border-2 border-line-strong bg-surface" />
                  <div className="pt-0.5">
                    <p className="text-sm text-muted">{eventLabel(code, s.methodType)}</p>
                    <p className="text-xs text-muted">Pending</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {s.trackingUrl && (
            <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary hover:underline">
              Track on {s.carrier}’s website
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
      )}
    </Drawer>
  );
}
