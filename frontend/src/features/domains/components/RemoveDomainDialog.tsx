"use client";

import { ConfirmDialog } from "@/components/platform/ConfirmDialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { domainsApi, useRemoveDomainMutation } from "../api";
import { cancelRemoveDomain, selectDomainFilters, selectPendingRemoveDomainId } from "../slice";
import type { Domain } from "../types";

export function RemoveDomainDialog() {
  const dispatch = useAppDispatch();
  const id = useAppSelector(selectPendingRemoveDomainId);
  const filters = useAppSelector(selectDomainFilters);
  // Look the domain up in whatever is cached: the current list page or its detail entry.
  const fromList = domainsApi.endpoints.getDomains.useQueryState(filters, {
    selectFromResult: ({ data }) => ({ domain: data?.data.find((d) => d.id === id) }),
  }).domain;
  const fromDetail = domainsApi.endpoints.getDomain.useQueryState(id ?? "", { skip: !id }).data;
  const domain: Domain | undefined = fromList ?? fromDetail;
  const [remove, { isLoading }] = useRemoveDomainMutation();

  return (
    <ConfirmDialog
      open={Boolean(id)}
      tone="danger"
      title={`Remove ${domain?.hostname ?? "this domain"}?`}
      description={
        domain?.primary
          ? `${domain.websiteName} will go back to its free ryugaware.com address. Visitors using this domain will see an error until you add it again.`
          : "Visitors using this domain will no longer reach your website. You can add it again later."
      }
      confirmLabel="Remove domain"
      requireText={domain?.primary ? domain.hostname : undefined}
      loading={isLoading}
      onConfirm={() => id && remove(id)}
      onCancel={() => dispatch(cancelRemoveDomain())}
    />
  );
}
