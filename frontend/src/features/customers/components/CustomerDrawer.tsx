"use client";

import { Ban, Mail, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { Alert } from "@/components/platform/Alert";
import { Drawer } from "@/components/platform/Drawer";
import { ErrorState } from "@/components/platform/ErrorState";
import { DescriptionList } from "@/components/platform/SettingsSection";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, formatDateTime, formatMoney, formatNumber, pluralize } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetCustomerQuery, useSetCustomerBlockedMutation } from "../api";
import { CUSTOMER_STATUS, ORDER_STATUS, SIGN_IN_LABEL } from "../constants";
import { closeCustomer, requestBlockCustomer, requestDeleteCustomer, selectOpenCustomerId } from "../slice";
import { CustomerAvatar } from "./CustomerAvatar";

export function CustomerDrawer() {
  const id = useAppSelector(selectOpenCustomerId);
  if (!id) return null;
  return <CustomerDrawerBody key={id} customerId={id} />;
}

function CustomerDrawerBody({ customerId }: { customerId: string }) {
  const dispatch = useAppDispatch();
  const { data: c, isLoading, isError, refetch, isFetching } = useGetCustomerQuery(customerId);
  const [setBlocked, blockState] = useSetCustomerBlockedMutation();

  return (
    <Drawer
      open
      onClose={() => dispatch(closeCustomer())}
      title="User details"
      description={c?.name}
      footer={
        c && (
          <>
            <Button variant="dangerGhost" leftIcon={<Trash2 className="size-4" />} onClick={() => dispatch(requestDeleteCustomer(c.id))} className="mr-auto max-sm:hidden">
              Delete
            </Button>
            {c.status === "blocked" ? (
              <Button variant="secondary" leftIcon={<ShieldCheck className="size-4" />} loading={blockState.isLoading} onClick={() => setBlocked({ id: c.id, blocked: false })}>
                Unblock
              </Button>
            ) : (
              <Button variant="secondary" leftIcon={<Ban className="size-4" />} onClick={() => dispatch(requestBlockCustomer(c.id))}>
                Block
              </Button>
            )}
            <ButtonLink href={`mailto:${c.email}`} className="max-sm:flex-1">
              <Mail className="size-4" aria-hidden />
              Send email
            </ButtonLink>
          </>
        )
      }
    >
      {isError ? (
        <ErrorState compact className="border-0" title="Couldn’t load this user" onRetry={refetch} retrying={isFetching} />
      ) : isLoading || !c ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-2 h-4 w-2/3" />
            </div>
          </div>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <CustomerAvatar customer={c} size={56} />
            <div className="min-w-0 flex-1">
              <p className="font-heading truncate text-lg font-semibold text-ink">{c.name}</p>
              <p className="truncate text-sm text-muted">{c.email}</p>
            </div>
            <StatusBadge value={c.status} map={CUSTOMER_STATUS} />
          </div>

          {c.status === "blocked" && <Alert tone="error">This user can’t sign in or place orders on {c.websiteName}.</Alert>}
          {c.status === "unverified" && <Alert tone="warning">{c.name.split(" ")[0]} hasn’t confirmed their email address yet, so they can browse but not check out.</Alert>}

          <DescriptionList
            items={[
              { label: "Website", value: c.websiteName },
              { label: "Sign-in method", value: SIGN_IN_LABEL[c.signInMethod] },
              { label: "Phone", value: c.phone ?? <span className="font-normal text-muted">Not added</span> },
              { label: "Joined", value: <span className="tabular-nums">{formatDate(c.joinedAt)}</span> },
              { label: "Last active", value: <span className="tabular-nums">{c.lastActiveAt ? formatDateTime(c.lastActiveAt) : "Never signed in"}</span> },
              {
                label: "Orders",
                value: (
                  <span className="tabular-nums">
                    {formatNumber(c.orders)} · {formatMoney(c.totalSpent)}
                    {c.orders > 0 && <span className="font-normal text-muted"> · avg {formatMoney(c.averageOrder)}</span>}
                  </span>
                ),
              },
            ]}
          />

          <section aria-labelledby="customer-addresses">
            <h3 id="customer-addresses" className="font-heading mb-3 text-base font-semibold">
              Addresses
            </h3>
            {c.addresses.length === 0 ? (
              <p className="text-sm text-muted">No saved addresses.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {c.addresses.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded-card border border-line p-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="flex items-center gap-2 font-medium text-ink">
                        {a.label}
                        {a.isDefault && <Badge tone="neutral">Default</Badge>}
                      </p>
                      <p className="text-body">
                        {a.line}, {a.city}, {a.state} {a.pincode}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="customer-orders">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 id="customer-orders" className="font-heading text-base font-semibold">
                Recent orders
              </h3>
              {c.orders > c.recentOrders.length && <span className="text-xs text-muted">Latest {c.recentOrders.length} of {formatNumber(c.orders)}</span>}
            </div>
            {c.recentOrders.length === 0 ? (
              <p className="text-sm text-muted">No orders yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {c.recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 rounded-md bg-page px-3 py-2.5 text-sm">
                    <code className="w-[72px] shrink-0 font-mono text-[13px] text-ink">{o.id}</code>
                    <span className="w-16 shrink-0 text-muted tabular-nums">{formatDate(o.placedAt).replace(/ \d{4}$/, "")}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-ink tabular-nums">
                      {formatMoney(o.total)}
                      <span className="font-normal text-muted"> · {pluralize(o.items, "item")}</span>
                    </span>
                    <StatusBadge value={o.status} map={ORDER_STATUS} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Button variant="dangerGhost" leftIcon={<Trash2 className="size-4" />} onClick={() => dispatch(requestDeleteCustomer(c.id))} className="self-start sm:hidden">
            Delete user
          </Button>
        </div>
      )}
    </Drawer>
  );
}
