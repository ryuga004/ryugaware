import { Logo } from "@/components/platform/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { MobileMenu } from "./MobileMenu";

export const LANDING_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {LANDING_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-ink-700 hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <ButtonLink href="/login" variant="ghost">
            Log in
          </ButtonLink>
          <ButtonLink href="/register">Get started</ButtonLink>
        </div>
        <MobileMenu links={LANDING_LINKS} />
      </div>
    </header>
  );
}
