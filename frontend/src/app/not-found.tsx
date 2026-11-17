import type { Metadata } from "next";
import { StatusScreen } from "@/components/platform/StatusScreen";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for doesn’t exist or has moved.",
};

/**
 * The app-wide 404: unmatched URLs anywhere in the app, and any `notFound()` call that
 * doesn't have a closer `not-found.tsx`. Kept as a Server Component with plain links,
 * because Next ships this file (and any Client Component it imports) with every route.
 */
export default function NotFound() {
  return (
    <StatusScreen
      illustration="not-found"
      code="Error 404"
      title="We can’t find that page"
      description="The link may be broken, or the page may have been renamed or removed. Check the address, or pick up where you left off."
      actions={
        <>
          <ButtonLink href="/websites">Go to dashboard</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Back to home
          </ButtonLink>
        </>
      }
    />
  );
}
