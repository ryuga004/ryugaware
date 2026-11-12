"use client";

import { KeyRound } from "lucide-react";
import { ConfirmDialog } from "@/components/platform/ConfirmDialog";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { PageHeader } from "@/components/platform/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetCustomerAuthQuery, useResetCustomerAuthMutation } from "../api";
import {
  cancelAuthScope,
  cancelResetAuth,
  selectAuthResetOpen,
  selectAuthScope,
  selectAuthSetupStarted,
  selectPendingAuthScope,
  setAuthScope,
  startAuthSetup,
} from "../slice";
import { AuthSettingsForm } from "./AuthSettingsForm";
import { ScopeRow } from "./ScopeRow";

export function CustomerAuthPage() {
  const dispatch = useAppDispatch();
  const scope = useAppSelector(selectAuthScope);
  const setupStarted = useAppSelector(selectAuthSetupStarted);
  // currentData: never show the previous scope's settings while the next one loads.
  const { currentData: data, isError, isFetching, refetch } = useGetCustomerAuthQuery(scope);

  return (
    <>
      <PageHeader title="Authentication" description="Choose how shoppers sign in to your websites." />

      {isError ? (
        <ErrorState title="We couldn’t load sign-in settings" onRetry={refetch} retrying={isFetching} />
      ) : !data ? (
        <AuthSkeleton scope={scope} onScopeChange={(s) => dispatch(setAuthScope(s))} />
      ) : !data.configured && !setupStarted ? (
        <EmptyState
          illustration="authentication"
          title="Let shoppers create accounts"
          description="Customer accounts let shoppers track orders, save addresses and check out faster. Start with email and password, and add Google sign-in whenever you’re ready."
          actions={
            <Button leftIcon={<KeyRound className="size-4" />} onClick={() => dispatch(startAuthSetup())}>
              Set up sign-in
            </Button>
          }
        />
      ) : (
        <AuthSettingsForm key={scope} response={data} setup={!data.configured} />
      )}

      <DiscardDialog />
      {data?.websiteName && <ResetDialog websiteName={data.websiteName} />}
    </>
  );
}

function DiscardDialog() {
  const dispatch = useAppDispatch();
  const pending = useAppSelector(selectPendingAuthScope);
  return (
    <ConfirmDialog
      open={pending !== null}
      title="Discard unsaved changes?"
      description="You have changes that aren’t saved. Switching websites discards them."
      confirmLabel="Discard changes"
      tone="danger"
      onConfirm={() => pending && dispatch(setAuthScope(pending))}
      onCancel={() => dispatch(cancelAuthScope())}
    />
  );
}

function ResetDialog({ websiteName }: { websiteName: string }) {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectAuthResetOpen);
  const scope = useAppSelector(selectAuthScope);
  const [resetScope, { isLoading }] = useResetCustomerAuthMutation();
  return (
    <ConfirmDialog
      open={open}
      title={`Reset ${websiteName} to the default?`}
      description={`${websiteName} will use the default sign-in settings again. Its own settings, including its Google client, are removed.`}
      confirmLabel="Reset to default"
      tone="danger"
      loading={isLoading}
      onConfirm={() => resetScope(scope)}
      onCancel={() => dispatch(cancelResetAuth())}
    />
  );
}

function AuthSkeleton({ scope, onScopeChange }: { scope: string; onScopeChange: (s: string) => void }) {
  return (
    <div aria-busy aria-label="Loading sign-in settings">
      <ScopeRow value={scope} onChange={onScopeChange} inherited={null} disabled />
      <div className="flex flex-col gap-10">
        {[4, 2].map((rows, i) => (
          <div key={i} className="grid gap-4 lg:grid-cols-3 lg:gap-8">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="space-y-5 rounded-card border border-line bg-surface p-6 lg:col-span-2">
              {Array.from({ length: rows }, (_, j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
