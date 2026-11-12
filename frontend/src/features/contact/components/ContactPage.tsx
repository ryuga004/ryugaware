"use client";

import { BookUser, Pencil, RotateCcw } from "lucide-react";
import { Alert } from "@/components/platform/Alert";
import { ConfirmDialog } from "@/components/platform/ConfirmDialog";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { PageHeader } from "@/components/platform/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetContactDetailsQuery, useResetContactDetailsMutation } from "../api";
import { formatPhone } from "../schemas";
import {
  cancelContactScope,
  cancelResetContact,
  openResetContact,
  requestContactScope,
  selectContactCustomizing,
  selectContactResetOpen,
  selectContactScope,
  selectContactSetupStarted,
  selectPendingContactScope,
  setContactScope,
  startContactSetup,
  startCustomizing,
} from "../slice";
import type { ContactScopeResponse } from "../types";
import { ContactForm } from "./ContactForm";
import { ContactPreview } from "./ContactPreview";
import { ContactScopeRow } from "./ContactScopeRow";

export function ContactPage() {
  const dispatch = useAppDispatch();
  const scope = useAppSelector(selectContactScope);
  const setupStarted = useAppSelector(selectContactSetupStarted);
  // currentData: never show the previous scope's details while the next one loads.
  const { currentData: data, isError, isFetching, refetch } = useGetContactDetailsQuery(scope);

  return (
    <>
      <PageHeader title="Contact details" description="Shown in your websites’ footer, contact page and invoices." />

      {isError ? (
        <ErrorState title="We couldn’t load your contact details" onRetry={refetch} retrying={isFetching} />
      ) : !data ? (
        <ContactSkeleton scope={scope} />
      ) : !data.configured && !setupStarted ? (
        <EmptyState
          illustration="contact"
          title="Add your contact details"
          description="Tell customers how to reach you. Your email, phone and address appear in the website footer, on the contact page and on invoices."
          actions={
            <Button leftIcon={<BookUser className="size-4" />} onClick={() => dispatch(startContactSetup())}>
              Add contact details
            </Button>
          }
        />
      ) : (
        <ContactScopeView key={scope} response={data} />
      )}

      <DiscardDialog />
      {data?.websiteName && <ResetDialog websiteName={data.websiteName} />}
    </>
  );
}

function ContactScopeView({ response }: { response: ContactScopeResponse }) {
  const dispatch = useAppDispatch();
  const customizing = useAppSelector(selectContactCustomizing);
  const { scope, websiteName, inherited, details, overrides } = response;
  const setup = !response.configured;

  const changeScope = (dirty: boolean) => (next: string) => {
    if (next !== scope) dispatch(dirty ? requestContactScope(next) : setContactScope(next));
  };

  const header = (dirty: boolean) => (
    <>
      {!setup && <ContactScopeRow value={scope} onChange={changeScope(dirty)} inherited={websiteName ? inherited : null} />}
      {setup && <Alert className="mb-6">Add your contact details so customers can reach you. They’re shown in the footer, on the contact page and in order emails.</Alert>}
      {websiteName && inherited && customizing && (
        <Alert className="mb-6">
          You’re giving <strong>{websiteName}</strong> its own contact details, starting from the default. The default stays as it is.
        </Alert>
      )}
      {websiteName && !inherited && (
        <Alert
          className="mb-6"
          action={
            <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="size-3.5" />} onClick={() => dispatch(openResetContact())} className="-my-1.5 shrink-0">
              Reset to default
            </Button>
          }
        >
          <strong>{websiteName}</strong> uses its own contact details. Reset to use the defaults again.
        </Alert>
      )}
    </>
  );

  const overridesCard = (dirty: boolean) =>
    scope === "default" && !setup && overrides.length > 0 ? (
      <section aria-labelledby="contact-overrides-title" className="rounded-card border border-line bg-surface p-5">
        <h2 id="contact-overrides-title" className="font-heading text-base font-semibold text-ink">
          Website overrides
        </h2>
        <p className="text-sm text-muted">
          {overrides.length === 1 ? "1 website uses its own details." : `${overrides.length} websites use their own details.`}
        </p>
        <ul className="mt-3 divide-y divide-line">
          {overrides.map((o) => (
            <li key={o.websiteId} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{o.websiteName}</p>
                <p className="text-xs text-muted">Updated {formatDate(o.updatedAt)}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => changeScope(dirty)(o.websiteId)}>
                View
              </Button>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  // An inheriting website: summary card + preview until "Customize for this website".
  if (websiteName && inherited && !customizing && details) {
    return (
      <>
        {header(false)}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-card border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-subtle text-ink-800">
                <BookUser className="size-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="font-heading text-lg font-semibold text-ink">{websiteName} uses your default contact details</h2>
                <p className="mt-1 text-sm break-words text-muted">
                  Support: {details.supportEmail} · {formatPhone(details.phone)}
                </p>
              </div>
            </div>
            <p className="mt-5 border-t border-line pt-5 text-sm text-body">
              Customers see the same address, hours and links as every other website. Customize them if this website needs its own contact point.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button leftIcon={<Pencil className="size-4" />} onClick={() => dispatch(startCustomizing())}>
                Customize for this website
              </Button>
              <Button variant="secondary" onClick={() => dispatch(setContactScope("default"))}>
                Edit default details
              </Button>
            </div>
          </section>
          <ContactPreview values={details} title={websiteName} />
        </div>
      </>
    );
  }

  return <ContactForm response={response} mode={setup ? "setup" : inherited ? "customize" : "edit"} header={header} aside={overridesCard} />;
}

function DiscardDialog() {
  const dispatch = useAppDispatch();
  const pending = useAppSelector(selectPendingContactScope);
  return (
    <ConfirmDialog
      open={pending !== null}
      title="Discard unsaved changes?"
      description="You have changes that aren’t saved. Switching websites discards them."
      confirmLabel="Discard changes"
      tone="danger"
      onConfirm={() => pending && dispatch(setContactScope(pending))}
      onCancel={() => dispatch(cancelContactScope())}
    />
  );
}

function ResetDialog({ websiteName }: { websiteName: string }) {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectContactResetOpen);
  const scope = useAppSelector(selectContactScope);
  const [resetScope, { isLoading }] = useResetContactDetailsMutation();
  return (
    <ConfirmDialog
      open={open}
      title={`Reset ${websiteName} to the default?`}
      description={`${websiteName} will show your default contact details again. Its own details are removed.`}
      confirmLabel="Reset to default"
      tone="danger"
      loading={isLoading}
      onConfirm={() => resetScope(scope)}
      onCancel={() => dispatch(cancelResetContact())}
    />
  );
}

function ContactSkeleton({ scope }: { scope: string }) {
  const dispatch = useAppDispatch();
  return (
    <div aria-busy aria-label="Loading contact details">
      <ContactScopeRow value={scope} onChange={(s) => dispatch(setContactScope(s))} inherited={null} disabled />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6 rounded-card border border-line bg-surface p-6">
          {[2, 4, 3].map((n, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-5 w-28" />
              <div className="grid gap-5 sm:grid-cols-2">
                {Array.from({ length: n }, (_, j) => (
                  <Skeleton key={j} className="h-14 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-[420px] rounded-card" />
      </div>
    </div>
  );
}
