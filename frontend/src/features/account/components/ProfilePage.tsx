"use client";

import { ErrorState } from "@/components/platform/ErrorState";
import { PageHeader } from "@/components/platform/PageHeader";
import { DescriptionList, SettingsSection } from "@/components/platform/SettingsSection";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { UsageBar } from "@/components/ui/UsageBar";
import { formatDate } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetLicenseQuery, useGetMeQuery } from "../api";
import { openEditProfile, selectLicense } from "../slice";

export function ProfilePage() {
  const dispatch = useAppDispatch();
  const { data: me, isLoading: meLoading, isError: meError, refetch: refetchMe, isFetching: meFetching } = useGetMeQuery();
  const { data: licenseData, isLoading: licenseLoading, isError: licenseError, refetch: refetchLicense } = useGetLicenseQuery();
  const snapshot = useAppSelector(selectLicense); // live-updated by website create / delete
  const license = licenseData && snapshot ? { ...licenseData, used: snapshot.used, limitReached: snapshot.limitReached } : licenseData;

  return (
    <>
      <PageHeader title="Profile" description="Your account details and license." />

      <div className="space-y-10">
        <SettingsSection title="Profile details" description="Your personal information.">
          {meError ? (
            <ErrorState title="Couldn’t load your profile" onRetry={refetchMe} retrying={meFetching} compact className="border-0" />
          ) : meLoading || !me ? (
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar name={me.fullName} size={56} />
                  <div>
                    <p className="font-heading text-base font-semibold">{me.fullName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted">{me.email}</span>
                      {me.emailVerified && <Badge tone="success">Verified</Badge>}
                    </div>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => dispatch(openEditProfile())} className="max-sm:w-full">
                  Edit profile
                </Button>
              </div>
              <div className="border-t border-line pt-5">
                <DescriptionList
                  items={[
                    { label: "Role", value: <span className="capitalize">{me.role} · {me.organizationName}</span> },
                    { label: "Member since", value: formatDate(me.createdAt) },
                  ]}
                />
              </div>
            </div>
          )}
        </SettingsSection>

        <SettingsSection title="License" description="What your license includes.">
          {licenseError ? (
            <ErrorState title="Couldn’t load your license" onRetry={refetchLicense} compact className="border-0" />
          ) : licenseLoading || !license ? (
            <div className="space-y-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          ) : (
            <>
              <DescriptionList
                items={[
                  { label: "License", value: license.plan },
                  { label: "Status", value: <Badge tone={license.status === "active" ? "success" : "danger"} className="capitalize">{license.status}</Badge> },
                  { label: "Website allowance", value: `${license.allowance} ${license.allowance === 1 ? "website" : "websites"}` },
                  {
                    label: "Websites used",
                    value: (
                      <div className="flex flex-col gap-1.5">
                        <UsageBar used={license.used} total={license.allowance} />
                        <span className="text-xs font-normal text-muted tabular-nums">
                          {license.used} of {license.allowance} used
                        </span>
                      </div>
                    ),
                  },
                ]}
              />
              {license.limitReached && <p className="mt-4 text-xs text-muted">You’ve used all websites included in your license.</p>}
            </>
          )}
        </SettingsSection>
      </div>
    </>
  );
}
