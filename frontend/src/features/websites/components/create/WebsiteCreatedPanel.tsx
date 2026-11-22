"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, SquarePen } from "lucide-react";
import { ErrorState } from "@/components/platform/ErrorState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "../StatusBadge";
import { useGetWebsiteQuery } from "../../api";

/** Shown straight after a website is created, with the one obvious next step: open the editor. */
export function WebsiteCreatedPanel({ websiteId }: { websiteId: string }) {
  const router = useRouter();
  const { data: website, isLoading, isError, refetch } = useGetWebsiteQuery(websiteId);

  if (isError) return <ErrorState title="We couldn’t load your new website" onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-[640px] py-6 sm:py-10">
      <div className="rounded-card border border-line bg-surface px-6 py-10 text-center sm:px-10">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-bg text-success">
          <Check className="size-6" aria-hidden />
        </span>

        {isLoading || !website ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
        ) : (
          <>
            <h1 className="font-heading mt-6 text-2xl leading-tight font-semibold text-ink">{website.name} is ready</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              We copied the {website.templateName} template into your website. Everything in it is yours to change.
            </p>

            <p className="mx-auto mt-4 max-w-sm text-sm text-muted">
              It takes cash on delivery and store pickup to begin with. Open the editor to add UPI, cards or a
              delivery partner you have already set up.
            </p>

            <dl className="mt-7 divide-y divide-line rounded-card border border-line text-left">
              <Row label="Website" value={website.name} />
              <Row label="Web address" value={<span className="font-mono text-sm">{website.url.replace("https://", "")}</span>} />
              <Row label="Template" value={website.templateName} />
              <Row label="Status" value={<StatusBadge status={website.status} />} />
            </dl>

            <div className="mt-8 flex flex-wrap justify-center gap-3 max-sm:w-full max-sm:flex-col">
              <Button leftIcon={<SquarePen className="size-4" />} onClick={() => router.push(`/websites/${website.id}/editor`)}>
                Open website editor
              </Button>
              <ButtonLink href={`/sites/${website.subdomain}`} target="_blank" rel="noreferrer" variant="secondary">
                Preview website
                <ExternalLink className="size-4" aria-hidden />
              </ButtonLink>
            </div>

            <div className="mt-6">
              <ButtonLink href="/websites" variant="ghost" size="sm">
                <ArrowLeft className="size-4" aria-hidden />
                Back to websites
              </ButtonLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}
