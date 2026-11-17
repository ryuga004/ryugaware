import { cn } from "@/lib/cn";
import { Illustration, type IllustrationName } from "./Illustration";
import { Logo } from "./Logo";

/**
 * Whole-page status screen: the app's 404 and "temporarily unavailable" surfaces
 * (`app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`).
 *
 * Inside the app shell, a single panel or list that is empty or failed keeps using
 * `EmptyState` / `ErrorState` — this one owns the whole viewport and carries the `h1`.
 */
export function StatusScreen({
  illustration,
  code,
  title,
  description,
  actions,
  note,
  /** Announce the screen when it replaces page content (error boundaries). */
  alert,
  className,
}: {
  illustration: IllustrationName;
  /** Short overline, e.g. "Error 404". */
  code: string;
  title: string;
  description: string;
  actions: React.ReactNode;
  /** Small line under the actions (support reference, next step). */
  note?: React.ReactNode;
  alert?: boolean;
  className?: string;
}) {
  return (
    <main className={cn("flex min-h-dvh flex-col items-center justify-center bg-page px-4 py-10 sm:px-6", className)}>
      <div className="flex w-full max-w-[560px] flex-col items-center">
        <Logo className="mb-8" />
        <section
          role={alert ? "alert" : undefined}
          className="flex w-full flex-col items-center rounded-card border border-line bg-surface px-6 py-12 text-center sm:px-10"
        >
          <Illustration name={illustration} size={160} className="mb-4" />
          <p className="font-mono text-xs font-medium tracking-wide text-muted uppercase">{code}</p>
          <h1 className="font-heading mt-2 text-2xl leading-tight font-semibold text-ink">{title}</h1>
          <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3 max-sm:w-full max-sm:flex-col">{actions}</div>
          {note && <p className="mt-6 text-xs text-faint">{note}</p>}
        </section>
      </div>
    </main>
  );
}
