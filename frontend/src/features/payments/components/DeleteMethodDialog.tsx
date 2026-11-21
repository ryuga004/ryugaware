"use client";

import { ConfirmDialog } from "@/components/platform/ConfirmDialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useDeletePaymentMethodMutation } from "../api";
import { PAYMENT_TYPE } from "../constants";
import { cancelDeleteMethod, selectPendingDeleteMethod } from "../slice";

export function DeleteMethodDialog() {
  const dispatch = useAppDispatch();
  // A snapshot taken when delete was requested: the optimistic update removes the row from the list.
  const method = useAppSelector(selectPendingDeleteMethod);
  const [remove, { isLoading }] = useDeletePaymentMethodMutation();
  const typeLabel = method?.type === "cod" ? "cash on delivery" : method ? PAYMENT_TYPE[method.type].label : "";

  return (
    <ConfirmDialog
      open={Boolean(method)}
      tone="danger"
      title={`Delete ${method?.displayName ?? "this payment method"}?`}
      description={method ? `Customers will no longer see ${typeLabel} at checkout. Past transactions stay in your history.` : undefined}
      confirmLabel="Delete method"
      loading={isLoading}
      onConfirm={() => method && remove(method.id)}
      onCancel={() => dispatch(cancelDeleteMethod())}
    />
  );
}
