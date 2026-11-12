"use client";

import { ConfirmDialog } from "@/components/platform/ConfirmDialog";
import { formatMoney } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { paymentsApi, useRefundTransactionMutation } from "../api";
import { cancelRefund, selectPendingRefundId } from "../slice";

export function RefundDialog() {
  const dispatch = useAppDispatch();
  const id = useAppSelector(selectPendingRefundId);
  // Refunds start from the detail modal, so the transaction is already cached.
  const t = paymentsApi.endpoints.getTransaction.useQueryState(id ?? "", { skip: !id }).data;
  const [refund, { isLoading }] = useRefundTransactionMutation();
  const amount = t ? formatMoney(t.amount, { paise: true }) : "this payment";

  return (
    <ConfirmDialog
      open={Boolean(id)}
      tone="danger"
      title={t ? `Refund ${amount} to ${t.customerName}?` : "Refund this payment?"}
      description={
        t?.methodType === "cod"
          ? "The payment is marked as refunded. Pay the customer back by bank transfer or UPI. This can’t be undone."
          : `The money goes back to their ${t?.methodLabel ?? "original payment method"} in 5–7 working days. Gateway fees aren’t returned. This can’t be undone.`
      }
      confirmLabel="Refund payment"
      loading={isLoading}
      onConfirm={() => id && refund(id)}
      onCancel={() => dispatch(cancelRefund())}
    />
  );
}
