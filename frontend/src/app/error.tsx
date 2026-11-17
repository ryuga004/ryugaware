"use client";

import { useEffect, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { StatusScreen } from "@/components/platform/StatusScreen";
import { Button, ButtonLink } from "@/components/ui/Button";
import { errorReference } from "@/lib/error";

/**
 * The app-wide "temporarily unavailable" screen: the root error boundary for everything
 * under the root layout (landing, auth and the signed-in app). The copy stays generic so it
 * covers maintenance, a service interruption and an unreachable dependency alike, and it
 * never shows the thrown value — only the digest Next generates, to match server logs.
 */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  const [retrying, startRetry] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const reference = errorReference(error);

  return (
    <StatusScreen
      alert
      illustration="unavailable"
      code="Error 503"
      title="Ryugaware is temporarily unavailable"
      description="Part of the service isn’t responding right now. This is usually brief, so try again in a moment."
      actions={
        <>
          <Button onClick={() => startRetry(() => retry())} loading={retrying} leftIcon={<RefreshCw className="size-4" />}>
            {retrying ? "Trying again…" : "Try again"}
          </Button>
          <ButtonLink href="/websites" variant="secondary">
            Go to dashboard
          </ButtonLink>
        </>
      }
      note={
        reference && (
          <>
            Reference <span className="font-mono">{reference}</span>
          </>
        )
      }
    />
  );
}
