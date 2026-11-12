"use client";

import { ConfirmDialog } from "@/components/platform/ConfirmDialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetShipmentQuery, useUpdateShipmentStatusMutation } from "../api";
import { cancelReturnShipment, selectPendingReturnShipmentId } from "../slice";

/** Marking a shipment as returned is final (no further actions), so it is confirmed first. */
export function ReturnShipmentDialog() {
  const dispatch = useAppDispatch();
  const id = useAppSelector(selectPendingReturnShipmentId);
  const { data: s } = useGetShipmentQuery(id ?? "", { skip: !id });
  const [update, { isLoading }] = useUpdateShipmentStatusMutation();

  return (
    <ConfirmDialog
      open={Boolean(id)}
      tone="danger"
      title={`Mark ${id ?? "shipment"} as returned?`}
      description={
        s
          ? `Use this when ${s.carrier === "Self" ? "the order" : `${s.carrier} has sent the order`} back to you. ${s.customerName} won’t receive it, and you can’t undo this.`
          : "Use this when the order has come back to you. You can’t undo this."
      }
      confirmLabel="Mark as returned"
      loading={isLoading}
      onConfirm={() => id && update({ id, action: "return" })}
      onCancel={() => dispatch(cancelReturnShipment())}
    />
  );
}
