"use client";

import { Check, Clock, RotateCcw, X } from "lucide-react";
import { Alert } from "@/components/platform/Alert";
import { CopyButton } from "@/components/platform/CopyButton";
import { ErrorState } from "@/components/platform/ErrorState";
import { Modal } from "@/components/platform/Modal";
import { DescriptionList } from "@/components/platform/SettingsSection";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetTransactionQuery } from "../api";
import { TX_STATUS } from "../constants";
import { closeTransaction, requestRefund, selectOpenTransactionId } from "../slice";
import type { TimelineStep } from "../types";

const money = (n: number) => formatMoney(n, { paise: true });

export function TransactionModal() {
  const id = useAppSelector(selectOpenTransactionId);
  if (!id) return null;
  return <TransactionModalBody id={id} />;
}

function TransactionModalBody({ id }: { id: string }) {
  const dispatch = useAppDispatch();
  const { data: t, isLoading, isError, refetch, isFetching } = useGetTransactionQuery(id);
  const close = () => dispatch(closeTransaction());

  return (
    <Modal
      open
      onClose={close}
      title={`Transaction ${id}`}
      description={t ? `${t.websiteName} · ${formatDateTime(t.createdAt)}` : undefined}
      footer={
        <>
          {t?.status === "succeeded" && (
            <Button variant="secondary" leftIcon={<RotateCcw className="size-4" />} onClick={() => dispatch(requestRefund(t.id))} className="mr-auto">
              Refund
            </Button>
          )}
          <Button onClick={close}>Close</Button>
        </>
      }
    >
      {isError ? (
        <ErrorState compact className="border-0" title="Couldn’t load this transaction" onRetry={refetch} retrying={isFetching} />
      ) : isLoading || !t ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-heading text-3xl font-semibold text-ink tabular-nums">{money(t.amount)}</p>
            <StatusBadge value={t.status} map={TX_STATUS} />
          </div>

          {t.status === "failed" && t.failureReason && <Alert tone="error">{t.failureReason} The customer was not charged.</Alert>}
          {t.status === "pending" && (
            <Alert tone="warning">
              {t.methodType === "cod" ? "The courier collects the cash when the order is delivered." : "Waiting for the bank to confirm. This usually takes a few minutes."}
            </Alert>
          )}
          {t.status === "refunded" && t.refundedAt && <Alert tone="info">Refunded on {formatDateTime(t.refundedAt)}.</Alert>}

          <DescriptionList
            items={[
              { label: "Amount", value: <span className="tabular-nums">{money(t.amount)}</span> },
              { label: t.methodType === "cod" ? "COD fee" : "Gateway fee", value: <span className="tabular-nums">{money(t.fee)}</span> },
              { label: "Net to you", value: <span className="tabular-nums">{money(t.net)}</span> },
              { label: "Method", value: `${t.providerLabel} · ${t.methodLabel}` },
              { label: "Website", value: t.websiteName },
              {
                label: "Customer",
                value: (
                  <span className="block min-w-0">
                    {t.customerName}
                    <span className="block truncate text-xs font-normal text-muted">{t.customerEmail}</span>
                  </span>
                ),
              },
              { label: "Order", value: <span className="font-mono text-[13px]">{t.orderId}</span> },
              {
                label: "Payment ID",
                value: (
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-[13px]">{t.id}</span>
                    <CopyButton value={t.id} label="Copy payment ID" size="sm" />
                  </span>
                ),
              },
            ]}
          />

          <section>
            <h3 className="font-heading mb-3 text-base font-semibold">Timeline</h3>
            <ol className="flex flex-col">
              {t.timeline.map((s, i) => (
                <TimelineItem key={s.label + i} step={s} last={i === t.timeline.length - 1} />
              ))}
            </ol>
          </section>
        </div>
      )}
    </Modal>
  );
}

function TimelineItem({ step, last }: { step: TimelineStep; last: boolean }) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span aria-hidden className="absolute top-6 bottom-0 left-[11px] w-0.5 bg-line-strong" />}
      <span
        className={cn(
          "relative flex size-6 shrink-0 items-center justify-center rounded-full",
          step.state === "done" && "bg-ink text-page",
          step.state === "failed" && "bg-danger text-white",
          step.state === "waiting" && "border border-dashed border-line-strong bg-surface text-muted",
        )}
      >
        {step.state === "done" ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : step.state === "failed" ? <X className="size-3.5" strokeWidth={3} aria-hidden /> : <Clock className="size-3.5" aria-hidden />}
        <span className="sr-only">{step.state === "done" ? "Done" : step.state === "failed" ? "Failed" : "Waiting"}</span>
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{step.label}</p>
        <p className="text-xs text-muted tabular-nums">{step.at ? formatDateTime(step.at) : "Not yet"}</p>
      </div>
    </li>
  );
}
