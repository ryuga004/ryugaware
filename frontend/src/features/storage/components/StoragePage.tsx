"use client";

import Image from "next/image";
import { Plug } from "lucide-react";
import { Alert } from "@/components/platform/Alert";
import { ConfirmDialog } from "@/components/platform/ConfirmDialog";
import { EmptyState } from "@/components/platform/EmptyState";
import { ErrorState } from "@/components/platform/ErrorState";
import { PageHeader } from "@/components/platform/PageHeader";
import { SettingsSection } from "@/components/platform/SettingsSection";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useDisconnectStorageMutation, useGetStorageConfigQuery } from "../api";
import { formatBytes } from "../format";
import {
  cancelDisconnectStorage,
  dismissStorageTest,
  openStorageSetup,
  selectStorageDisconnectOpen,
  selectStorageLastTest,
  selectStorageSetupOpen,
} from "../slice";
import type { StorageConfig } from "../types";
import { StorageForm } from "./StorageForm";
import { StorageStatusCard } from "./StorageStatusCard";
import { StorageTestResults } from "./StorageTestResults";

const DESCRIPTION = "Connect your own Amazon S3 or S3-compatible bucket for your websites’ images and files.";

export function StoragePage() {
  const { data, isLoading, isError, isFetching, refetch } = useGetStorageConfigQuery();
  const setupOpen = useAppSelector(selectStorageSetupOpen);

  return (
    <>
      <PageHeader title="Storage" description={DESCRIPTION} />
      {isError ? (
        <ErrorState title="We couldn’t load your storage settings" onRetry={refetch} retrying={isFetching} />
      ) : isLoading || !data ? (
        <StorageSkeleton />
      ) : data.status === "not_connected" && !setupOpen ? (
        <StorageOnboarding config={data} />
      ) : (
        <StorageSettings config={data} />
      )}
      {data && data.status !== "not_connected" && <DisconnectDialog config={data} />}
    </>
  );
}

function StorageOnboarding({ config }: { config: StorageConfig }) {
  const dispatch = useAppDispatch();
  return (
    <EmptyState
      illustration="storage"
      title="Keep media in your own bucket"
      description={`Images and files uploaded to your websites go to Ryugaware’s storage (up to ${formatBytes(config.fallbackQuotaBytes)}). Connect an Amazon S3 or S3-compatible bucket to keep them in your own account, with no limit from us.`}
      actions={
        <Button leftIcon={<Plug className="size-4" />} onClick={() => dispatch(openStorageSetup())}>
          Connect bucket
        </Button>
      }
    >
      <Image
        src="/images/storage/connect.webp"
        alt="Your website uploads files to Ryugaware, which stores them in your S3 bucket over an encrypted connection"
        width={1280}
        height={640}
        sizes="(min-width: 768px) 640px, 100vw"
        loading="eager"
        className="mt-8 h-auto w-full max-w-[640px]"
      />
    </EmptyState>
  );
}

function StorageSettings({ config }: { config: StorageConfig }) {
  const dispatch = useAppDispatch();
  const sessionTest = useAppSelector(selectStorageLastTest);
  const connected = config.status !== "not_connected";
  // A fresh test from this session wins; otherwise show the stored result when the saved settings are failing.
  const result = sessionTest ?? (config.status === "failed" ? config.lastTest : null);

  return (
    <div className="flex flex-col gap-10 pb-24">
      {connected ? (
        <StorageStatusCard config={config} />
      ) : (
        <Alert>
          Uploads currently go to Ryugaware’s default storage (up to {formatBytes(config.fallbackQuotaBytes)}). Connect your own bucket to keep files in your account. Use{" "}
          <strong>Test connection</strong> to check the settings before connecting.
        </Alert>
      )}

      {result && <StorageTestResults result={result} onDismiss={sessionTest ? () => dispatch(dismissStorageTest()) : undefined} />}

      <SettingsSection
        title="Bucket connection"
        description="Files uploaded to your websites are stored in your own bucket. Ryugaware needs read, write and delete access to it (s3:GetObject, s3:PutObject, s3:DeleteObject, s3:ListBucket)."
      >
        <StorageForm config={config} mode={connected ? "edit" : "setup"} />
      </SettingsSection>
    </div>
  );
}

function DisconnectDialog({ config }: { config: StorageConfig }) {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectStorageDisconnectOpen);
  const [disconnect, { isLoading }] = useDisconnectStorageMutation();
  return (
    <ConfirmDialog
      open={open}
      tone="danger"
      title="Disconnect this bucket?"
      description="New uploads will go to Ryugaware’s default storage. Existing files stay in your bucket, but links to them keep working only while the bucket stays public."
      requireText={config.bucket}
      confirmLabel="Disconnect"
      loading={isLoading}
      onConfirm={() => disconnect()}
      onCancel={() => dispatch(cancelDisconnectStorage())}
    />
  );
}

function StorageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading storage settings">
      <Skeleton className="h-[88px] w-full rounded-card" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-[104px] rounded-card" />
        <Skeleton className="h-[104px] rounded-card" />
        <Skeleton className="h-[104px] rounded-card" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-5 rounded-card border border-line bg-surface p-6 lg:col-span-2">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
