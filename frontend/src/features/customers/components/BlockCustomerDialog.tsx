"use client";

import { ConfirmDialog } from "@/components/platform/ConfirmDialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useSetCustomerBlockedMutation } from "../api";
import { cancelBlockCustomer, selectPendingBlockId } from "../slice";
import { useCachedCustomer } from "./useCachedCustomer";

export function BlockCustomerDialog() {
  const dispatch = useAppDispatch();
  const id = useAppSelector(selectPendingBlockId);
  const customer = useCachedCustomer(id);
  const [setBlocked] = useSetCustomerBlockedMutation();

  return (
    <ConfirmDialog
      open={Boolean(id)}
      tone="danger"
      title={`Block ${customer?.name ?? "this user"}?`}
      description={`They won’t be able to sign in or place orders on ${customer?.websiteName ?? "your website"}. You can unblock them at any time.`}
      confirmLabel="Block user"
      // Optimistic: the slice closes this dialog as soon as the request starts.
      onConfirm={() => id && setBlocked({ id, blocked: true })}
      onCancel={() => dispatch(cancelBlockCustomer())}
    />
  );
}
