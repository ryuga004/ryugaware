"use client";

import { useAppSelector } from "@/store/hooks";
import { customersApi } from "../api";
import { selectCustomerFilters } from "../slice";
import type { Customer } from "../types";

/** Finds a customer in whatever is cached: the current list page or the detail entry (drawer). */
export function useCachedCustomer(id: string | null): Customer | undefined {
  const filters = useAppSelector(selectCustomerFilters);
  const fromList = customersApi.endpoints.getCustomers.useQueryState(filters, {
    selectFromResult: ({ data }) => ({ customer: data?.data.find((c) => c.id === id) }),
  }).customer;
  const fromDetail = customersApi.endpoints.getCustomer.useQueryState(id ?? "", { skip: !id }).data;
  return fromDetail ?? fromList;
}
