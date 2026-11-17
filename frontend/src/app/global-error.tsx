"use client";

import { useEffect, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { StatusScreen } from "@/components/platform/StatusScreen";
import { Button, ButtonLink } from "@/components/ui/Button";
import { errorReference } from "@/lib/error";
import "./globals.css";

/**
 * Last resort: the root layout itself failed, so this file replaces it and has to bring its own
 * document and styles. The root layout's `next/font` variables are gone with it, so the font
 * tokens are pointed at the system stack rather than re-downloading fonts on a failing page.
 */
const SYSTEM_FONTS = {
  "--font-inter": "ui-sans-serif",
  "--font-space-grotesk": "ui-sans-serif",
  "--font-orbitron": "ui-sans-serif",
  "--font-jetbrains-mono": "ui-monospace",
} as React.CSSProperties;

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const [retrying, startRetry] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const reference = errorReference(error);

  return (
    <html lang="en" style={SYSTEM_FONTS}>
      <body>
        <title>Temporarily unavailable · Ryugaware</title>
        <StatusScreen
          alert
          illustration="unavailable"
          code="Error 503"
          title="Ryugaware is temporarily unavailable"
          description="We can’t load the app right now. This is usually brief, so try again in a moment."
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
      </body>
    </html>
  );
}
