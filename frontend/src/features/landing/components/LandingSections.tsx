import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/components/platform/Logo";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

const container = "mx-auto max-w-[1120px] px-5 sm:px-6";

/** Decorative ember disc with concentric rings (large graphics only: ember is a seasoning, not a surface). */
function EmberGraphic({ size, ringClass, className }: { size: number; ringClass: string; className?: string }) {
  return (
    <div aria-hidden className={className} style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full bg-ember" />
      {[1.2, 1.45].map((k) => (
        <div key={k} className={`absolute rounded-full border ${ringClass}`} style={{ width: size * k, height: size * k, left: -(size * (k - 1)) / 2, top: -(size * (k - 1)) / 2 }} />
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className={`${container} grid items-center gap-12 py-16 md:py-24 lg:grid-cols-12`}>
        <div className="lg:col-span-5">
          <Badge tone="ember">Website builder for online stores</Badge>
          <h1 className="font-heading mt-5 text-[32px] leading-[1.15] font-semibold tracking-tight text-ink md:text-[40px] md:leading-[1.2]">
            Launch your online store on your own website
          </h1>
          <p className="mt-5 text-base text-body md:text-lg">
            Pick a ready-made store template, add your products, and start taking orders on your own web address. No code needed.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/register" size="lg">
              Get started free
            </ButtonLink>
            <ButtonLink href="#how-it-works" size="lg" variant="secondary">
              See how it works
            </ButtonLink>
          </div>
          <p className="mt-4 text-xs text-muted">1 website included · No credit card needed</p>
        </div>

        <div className="relative lg:col-span-7">
          <EmberGraphic size={300} ringClass="border-line" className="absolute -right-10 top-10 hidden md:block" />
          <Image
            src="/images/landing/hero.webp"
            alt="A Ryugaware storefront with its admin panel showing orders and products"
            width={1264}
            height={848}
            preload
            quality={85}
            sizes="(min-width: 1120px) 640px, (min-width: 1024px) 58vw, 100vw"
            className="relative h-auto w-full rounded-card border border-line-strong shadow-drawer"
          />
        </div>
      </div>
    </section>
  );
}

const FEATURES: { image: string; title: string; text: string }[] = [
  { image: "templates", title: "Ready-made store template", text: "Start from a polished storefront and change colors, fonts and layout." },
  { image: "domain", title: "Your own web address", text: "A free subdomain to start, and a custom domain when you are ready." },
  { image: "products", title: "Products and inventory", text: "Add products, variants and stock levels from one simple admin." },
  { image: "payments", title: "Payments and cash on delivery", text: "Accept card payments or let customers pay when the order arrives." },
  { image: "delivery", title: "Delivery zones and rates", text: "Set where you deliver and what each zone costs." },
  { image: "admin", title: "An admin panel for every website", text: "Manage orders, customers and settings separately for each store." },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 bg-subtle py-16 md:py-24">
      <div className={container}>
        <p className="text-xs font-medium tracking-[0.08em] text-primary">FEATURES</p>
        <h2 className="font-heading mt-2 text-[28px] leading-tight font-semibold md:text-[32px]">Everything you need to sell online</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ image, title, text }) => (
            <article key={title} className="overflow-hidden rounded-card border border-line bg-surface">
              <Image
                src={`/images/landing/feature-${image}.webp`}
                alt=""
                width={1120}
                height={720}
                sizes="(min-width: 1120px) 360px, (min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw"
                className="aspect-[14/9] h-auto w-full border-b border-line bg-subtle object-cover"
              />
              <div className="p-6">
                <h3 className="font-heading text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { image: "step-1-choose", title: "Choose a template", text: "Pick a storefront that fits your brand." },
  { image: "step-2-add", title: "Add your products and branding", text: "Upload your logo, products and prices." },
  { image: "step-3-publish", title: "Publish and start selling", text: "Go live on your own web address." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 py-16 md:py-24">
      <div className={container}>
        <p className="text-xs font-medium tracking-[0.08em] text-primary">HOW IT WORKS</p>
        <h2 className="font-heading mt-2 text-[28px] leading-tight font-semibold md:text-[32px]">Live in three steps</h2>
        <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          <div aria-hidden className="absolute top-5 right-[16%] left-5 hidden h-px bg-line-strong md:block" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-5 md:block">
              <span className="font-heading relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-base font-semibold text-page">{i + 1}</span>
              <div className="min-w-0 md:mt-6">
                <h3 className="font-heading text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.text}</p>
                <Image
                  src={`/images/landing/${s.image}.webp`}
                  alt=""
                  width={720}
                  height={480}
                  sizes="(min-width: 1120px) 340px, (min-width: 768px) 30vw, 85vw"
                  className="mt-5 h-auto w-full rounded-card border border-line bg-subtle"
                />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const INCLUDED = [
  "Ready-made store template",
  "Free subdomain, custom domain ready",
  "Products, orders and customers",
  "Card payments and cash on delivery",
  "Delivery zones and rates",
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16 bg-subtle py-16 md:py-24">
      <div className={container}>
        <div className="text-center">
          <p className="text-xs font-medium tracking-[0.08em] text-primary">PRICING</p>
          <h2 className="font-heading mt-2 text-[28px] leading-tight font-semibold md:text-[32px]">Simple to start</h2>
        </div>
        <div className="mx-auto mt-10 max-w-[480px] rounded-card border border-line bg-surface p-8">
          <h3 className="font-heading text-2xl font-semibold">1 website included</h3>
          <p className="mt-1.5 text-sm text-muted">Everything you need to launch your first store.</p>
          <ul className="my-6 flex flex-col gap-3 border-t border-line pt-6">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm">
                <Check className="size-4 shrink-0 text-success" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <ButtonLink href="/register" size="lg" fullWidth>
            Get started
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-ink">
      <Image src="/images/landing/cta-bg.webp" alt="" fill sizes="100vw" className="object-cover object-right lg:object-contain" />
      {/* Flat scrim (no gradient) keeps the headline readable on any crop. */}
      <div aria-hidden className="absolute inset-0 bg-ink/55 md:bg-transparent" />
      <div className={`${container} relative flex flex-col justify-center py-16 md:py-24 lg:min-h-[460px]`}>
        <h2 className="font-heading max-w-[700px] text-[32px] leading-[1.2] font-semibold tracking-tight text-page md:text-[40px]">Your store could be live today</h2>
        <p className="mt-4 text-base text-on-dark">Start with a template. Add products when you are ready.</p>
        <ButtonLink href="/register" variant="cream" size="lg" className="mt-8 self-start max-sm:self-stretch">
          Get started
        </ButtonLink>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const columns = [
    { title: "Product", links: [{ label: "Features", href: "#features" }, { label: "Pricing", href: "#pricing" }] },
    { title: "Account", links: [{ label: "Log in", href: "/login" }, { label: "Get started", href: "/register" }] },
    { title: "Legal", links: [{ label: "Terms", href: "#" }, { label: "Privacy", href: "#" }] },
  ];
  return (
    <footer className="border-t border-line">
      <div className={`${container} py-14`}>
        <div className="grid gap-10 md:grid-cols-[1fr_auto] md:gap-24">
          <div>
            <Logo />
            <p className="mt-4 max-w-[280px] text-sm text-muted">Build the store. Keep the calm.</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-16">
            {columns.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <p className="font-heading text-sm font-semibold">{c.title}</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-body hover:text-ink hover:underline">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <p className="mt-12 border-t border-line pt-6 text-xs text-muted">© 2026 Ryugaware</p>
      </div>
    </footer>
  );
}
