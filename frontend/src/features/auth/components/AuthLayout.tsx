import Link from "next/link";
import { Logo } from "@/components/platform/Logo";
import { AuthPanelImage } from "./AuthPanelImage";

/**
 * Shared frame for every auth screen: dark brand panel on large screens, plain cream page with a 400px
 * form column everywhere. No card chrome on mobile.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(420px,560px)_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink lg:block">
        <AuthPanelImage />
        <div className="relative z-10 flex h-full flex-col p-12">
          <Logo dark />
          <div className="mt-[12vh]">
            <h2 className="font-heading text-[40px] leading-[1.2] font-semibold text-page">
              Build the store.
              <br />
              <span className="text-glow">Keep the calm.</span>
            </h2>
            <p className="mt-5 max-w-[400px] text-base text-on-dark">Launch an online store on your own web address, with an admin panel for every website.</p>
          </div>
          <p className="mt-auto text-xs text-on-dark">© 2026 Ryugaware</p>
        </div>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-xs text-muted">
          <Link href="#" className="hover:underline">Terms</Link>
          <span aria-hidden> · </span>
          <Link href="#" className="hover:underline">Privacy</Link>
        </p>
      </main>
    </div>
  );
}

export function AuthHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-7">
      <h1 className="font-heading text-2xl leading-tight font-semibold text-ink">{title}</h1>
      {description && <p className="mt-2 text-sm text-muted">{description}</p>}
    </div>
  );
}

/** Centred status block used by verify / sent / success / error states. */
export function StatusPanel({
  icon,
  tone = "neutral",
  title,
  children,
  actions,
}: {
  icon: React.ReactNode;
  tone?: "neutral" | "success" | "danger";
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const bg = tone === "success" ? "bg-success-bg text-success" : tone === "danger" ? "bg-danger-bg text-danger" : "bg-subtle text-primary";
  return (
    <div className="flex flex-col items-center text-center" role={tone === "danger" ? "alert" : "status"}>
      <div className={`mb-6 flex size-14 items-center justify-center rounded-full ${bg}`}>{icon}</div>
      <h1 className="font-heading text-2xl leading-tight font-semibold text-ink">{title}</h1>
      {children && <div className="mt-3 text-sm text-body">{children}</div>}
      {actions && <div className="mt-7 flex w-full flex-col gap-3">{actions}</div>}
    </div>
  );
}

export function AuthFooterLink({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 text-center text-sm text-body">{children}</p>;
}

export const authLinkClass = "font-medium text-primary hover:underline";
