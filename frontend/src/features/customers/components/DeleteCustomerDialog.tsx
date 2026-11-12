"use client";

import { ConfirmDialog } from "@/components/platform/ConfirmDialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useDeleteCustomerMutation } from "../api";
import { cancelDeleteCustomer, selectPendingDeleteCustomerId } from "../slice";
import { useCachedCustomer } from "./useCachedCustomer";

export function DeleteCustomerDialog() {
  const dispatch = useAppDispatch();
  const id = useAppSelector(selectPendingDeleteCustomerId);
  const customer = useCachedCustomer(id);
  const [remove] = useDeleteCustomerMutation();

  return (
    <ConfirmDialog
      open={Boolean(id)}
      tone="danger"
      title={`Delete ${customer?.name ?? "this user"}?`}
      description={`Their account and saved addresses on ${customer?.websiteName ?? "your website"} are removed permanently. Past orders stay in your records. They can sign up again with the same email.`}
      confirmLabel="Delete user"
      requireText={customer?.name}
      // Optimistic: the dialog closes and the row disappears at once; the row comes back (with a toast) if the server refuses.
      onConfirm={() => id && remove(id)}
      onCancel={() => dispatch(cancelDeleteCustomer())}
    />
  );
}
