"use client";

import { ConfirmDialog } from "@/components/platform/ConfirmDialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deliveryApi, useDeleteDeliveryMethodMutation } from "../api";
import { cancelDeleteMethod, selectMethodFilters, selectPendingDeleteMethodId } from "../slice";
import type { DeliveryMethod } from "../types";

export function DeleteMethodDialog() {
  const dispatch = useAppDispatch();
  const id = useAppSelector(selectPendingDeleteMethodId);
  const filters = useAppSelector(selectMethodFilters);
  // The method is in the current list page or (when opened from the edit drawer) in its detail entry.
  const fromList = deliveryApi.endpoints.getDeliveryMethods.useQueryState(filters, {
    selectFromResult: ({ data }) => ({ method: data?.data.find((m) => m.id === id) }),
  }).method;
  const fromDetail = deliveryApi.endpoints.getDeliveryMethod.useQueryState(id ?? "", { skip: !id }).data;
  const method: DeliveryMethod | undefined = fromList ?? fromDetail;
  const [remove] = useDeleteDeliveryMethodMutation();

  return (
    <ConfirmDialog
      open={Boolean(id)}
      tone="danger"
      title={`Delete ${method?.name ?? "this delivery method"}?`}
      description={
        method?.enabled
          ? "Customers will no longer see it at checkout. Orders already shipped with it are not affected."
          : "It’s already hidden from checkout. Orders already shipped with it are not affected."
      }
      confirmLabel="Delete method"
      onConfirm={() => {
        // Optimistic: the row disappears now and comes back (with an error toast) if the server refuses.
        if (id) remove(id);
        dispatch(cancelDeleteMethod());
      }}
      onCancel={() => dispatch(cancelDeleteMethod())}
    />
  );
}
