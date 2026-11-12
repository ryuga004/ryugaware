"use client";

import { ConfirmDialog } from "@/components/platform/ConfirmDialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useDeleteWebsiteMutation, useGetWebsiteQuery } from "../api";
import { cancelDelete, selectPendingDeleteId } from "../slice";

/** Type-the-name-to-confirm dialog. Opened by `requestDelete(id)` from the card, table or edit drawer. */
export function DeleteWebsiteDialog() {
  const dispatch = useAppDispatch();
  const id = useAppSelector(selectPendingDeleteId);
  const { data: website } = useGetWebsiteQuery(id ?? "", { skip: !id });
  const [deleteWebsite, { isLoading }] = useDeleteWebsiteMutation();

  return (
    <ConfirmDialog
      open={Boolean(id && website)}
      tone="danger"
      title={`Delete ${website?.name ?? "website"}?`}
      description="This permanently deletes the website, its pages, products, orders and customer data. This can’t be undone."
      requireText={website?.name}
      confirmLabel="Delete website"
      loading={isLoading}
      onCancel={() => dispatch(cancelDelete())}
      onConfirm={() => id && deleteWebsite(id)}
    />
  );
}
