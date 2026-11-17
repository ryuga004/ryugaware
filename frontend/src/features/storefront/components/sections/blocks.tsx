"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { CATEGORIES, productsBySource, type ShowcaseSource } from "../../templates/ecommerce/catalog";
import { list, num, str } from "../../settings";
import type { SiteSection } from "../../types";
import { Container, ProductCard, SectionHeading, SfButton, SfButtonLink, SfImage, SfLink, Stars, inputClass } from "../ui";

export function Hero({ section }: { section: SiteSection }) {
  const s = section.settings;
  const eyebrow = str(s, "eyebrow");
  const heading = str(s, "heading");
  const body = str(s, "body");
  const ctaLabel = str(s, "ctaLabel");
  const secondaryLabel = str(s, "secondaryLabel");
  const image = str(s, "image");
  const full = str(s, "layout", "split") === "full";

  const copy = (
    <div className={cn("flex flex-col", full && "items-center text-center")}>
      {eyebrow && <p className="mb-4 text-xs font-medium tracking-[0.18em] text-sf-secondary uppercase">{eyebrow}</p>}
      <h1 className={cn("font-sf-display text-4xl leading-[1.08] text-sf-ink sm:text-5xl", full && "text-white lg:text-6xl")}>{heading}</h1>
      {body && <p className={cn("mt-5 max-w-md text-base leading-relaxed text-sf-body", full && "text-sf-on-dark")}>{body}</p>}
      <div className={cn("mt-8 flex flex-wrap gap-3", full && "justify-center")}>
        {ctaLabel && <SfButtonLink to={str(s, "ctaTarget", "/products")} size="lg">{ctaLabel}</SfButtonLink>}
        {secondaryLabel && (
          <SfButtonLink to={str(s, "secondaryTarget", "/shop")} variant={full ? "dark" : "outline"} size="lg">
            {secondaryLabel}
          </SfButtonLink>
        )}
      </div>
    </div>
  );

  if (full) {
    return (
      <section className="relative isolate flex min-h-[460px] items-center justify-center overflow-hidden bg-sf-dark py-20">
        {image && <SfImage src={image} priority sizes={"100vw"} className="object-cover opacity-45" />}
        <Container className="relative">{copy}</Container>
      </section>
    );
  }

  return (
    <section className="bg-sf-canvas">
      <Container className="grid items-center gap-10 py-14 lg:grid-cols-2 lg:gap-16 lg:py-20">
        {copy}
        {image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-sf-lg bg-sf-paper lg:aspect-[4/4.4]">
            <SfImage src={image} priority sizes={"(max-width: 1024px) 100vw, 560px"} className="object-cover" />
          </div>
        )}
      </Container>
    </section>
  );
}

export function ShopHero({ section }: { section: SiteSection }) {
  const image = str(section.settings, "image");
  return (
    <section className="relative isolate overflow-hidden bg-sf-dark">
      {image && <SfImage src={image} sizes={"100vw"} className="object-cover opacity-40" />}
      <Container className="relative py-16 text-center lg:py-20">
        <h1 className="font-sf-display text-3xl text-white sm:text-4xl">{str(section.settings, "heading")}</h1>
        {str(section.settings, "body") && <p className="mx-auto mt-4 max-w-xl text-sm text-sf-on-dark">{str(section.settings, "body")}</p>}
      </Container>
    </section>
  );
}

export function FeaturedCategories({ section }: { section: SiteSection }) {
  const limit = num(section.settings, "limit", 4);
  const feature = str(section.settings, "layout", "grid") === "feature";
  const items = CATEGORIES.slice(0, Math.max(2, Math.min(limit, CATEGORIES.length)));
  const [lead, ...rest] = items;

  return (
    <section className="py-14 lg:py-20">
      <Container>
        <SectionHeading heading={str(section.settings, "heading")} subheading={str(section.settings, "subheading")} />
        {feature ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryTile category={lead} className="lg:aspect-auto lg:min-h-[420px]" large />
            <div className="grid gap-4 sm:grid-cols-2">
              {rest.map((c) => (
                <CategoryTile key={c.id} category={c} />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {items.map((c) => (
              <CategoryTile key={c.id} category={c} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

function CategoryTile({ category, className, large }: { category: (typeof CATEGORIES)[number]; className?: string; large?: boolean }) {
  return (
    <SfLink to="/products" className={cn("group relative block aspect-[4/5] overflow-hidden rounded-sf bg-sf-canvas", className)}>
      <SfImage src={category.image} sizes={large ? "(max-width: 1024px) 100vw, 560px" : "(max-width: 640px) 50vw, 280px"} className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sf-dark/80 to-transparent p-5">
        <p className={cn("font-sf-display text-white", large ? "text-2xl" : "text-lg")}>{category.name}</p>
        <p className="mt-1 line-clamp-1 text-xs text-white/80">{category.blurb}</p>
      </div>
    </SfLink>
  );
}

export function ProductShowcase({ section }: { section: SiteSection }) {
  const source = str(section.settings, "source", "featured") as ShowcaseSource;
  const limit = num(section.settings, "limit", 4);
  const ctaLabel = str(section.settings, "ctaLabel");
  const products = productsBySource(source, Math.max(2, Math.min(limit, 8)));

  return (
    <section className="py-14 lg:py-16">
      <Container>
        <SectionHeading
          heading={str(section.settings, "heading")}
          subheading={str(section.settings, "subheading")}
          action={
            ctaLabel ? (
              <SfLink to={str(section.settings, "ctaTarget", "/products")} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-sf-primary hover:underline">
                {ctaLabel}
                <ArrowRight className="size-4" aria-hidden />
              </SfLink>
            ) : undefined
          }
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Container>
    </section>
  );
}

export function PromoBanner({ section }: { section: SiteSection }) {
  const s = section.settings;
  const tone = str(s, "tone", "dark");
  const image = str(s, "image");
  const ctaLabel = str(s, "ctaLabel");
  const dark = tone === "dark";
  const accent = tone === "accent";

  return (
    <section className={cn("py-14 lg:py-16", !dark && !accent && "bg-sf-canvas")}>
      <Container>
        <div className={cn("grid overflow-hidden rounded-sf-lg md:grid-cols-2", dark && "bg-sf-dark", accent && "bg-sf-primary", !dark && !accent && "border border-sf-line bg-sf-paper")}>
          <div className="flex flex-col justify-center p-8 lg:p-12">
            {str(s, "eyebrow") && (
              <p className={cn("mb-3 text-xs font-medium tracking-[0.18em] uppercase", dark || accent ? "text-sf-secondary" : "text-sf-muted")}>{str(s, "eyebrow")}</p>
            )}
            <h2 className={cn("font-sf-display text-2xl leading-tight sm:text-3xl", dark || accent ? "text-white" : "text-sf-ink")}>{str(s, "heading")}</h2>
            {str(s, "body") && <p className={cn("mt-4 max-w-md text-sm leading-relaxed", dark || accent ? "text-white/80" : "text-sf-body")}>{str(s, "body")}</p>}
            {ctaLabel && (
              <div className="mt-7">
                <SfButtonLink to={str(s, "ctaTarget", "/products")} variant={dark || accent ? "dark" : "solid"} className={cn((dark || accent) && "bg-white text-sf-ink hover:bg-white/90")}>
                  {ctaLabel}
                </SfButtonLink>
              </div>
            )}
          </div>
          {image && (
            <div className="relative order-first aspect-[16/10] md:order-last md:aspect-auto md:min-h-[320px]">
              <SfImage src={image} sizes={"(max-width: 768px) 100vw, 560px"} className="object-cover" />
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

export function BrandIntro({ section }: { section: SiteSection }) {
  const s = section.settings;
  const image = str(s, "image");
  const stats = list<{ value?: string; label?: string }>(s, "stats");
  const ctaLabel = str(s, "ctaLabel");

  return (
    <section className="py-14 lg:py-20">
      <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-sf-lg bg-sf-canvas">
            <SfImage src={image} sizes={"(max-width: 1024px) 100vw, 520px"} className="object-cover" />
          </div>
        )}
        <div>
          {str(s, "eyebrow") && <p className="mb-3 text-xs font-medium tracking-[0.18em] text-sf-secondary uppercase">{str(s, "eyebrow")}</p>}
          <h2 className="font-sf-display text-2xl leading-tight text-sf-ink sm:text-3xl">{str(s, "heading")}</h2>
          {str(s, "body") && <p className="mt-5 text-sm leading-relaxed text-sf-body">{str(s, "body")}</p>}
          {stats.length > 0 && (
            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-sf-line pt-6">
              {stats.map((stat, i) => (
                <div key={i}>
                  <dt className="sr-only">{String(stat.label ?? "")}</dt>
                  <dd>
                    <span className="font-sf-display block text-2xl text-sf-ink tabular-nums">{String(stat.value ?? "")}</span>
                    <span className="mt-1 block text-xs text-sf-muted">{String(stat.label ?? "")}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {ctaLabel && (
            <div className="mt-8">
              <SfButtonLink to={str(s, "ctaTarget", "/shop")} variant="outline">
                {ctaLabel}
              </SfButtonLink>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

export function Testimonials({ section }: { section: SiteSection }) {
  const items = list<{ quote?: string; author?: string; location?: string; rating?: number }>(section.settings, "items");
  if (items.length === 0) return null;
  return (
    <section className="bg-sf-canvas py-14 lg:py-20">
      <Container>
        <SectionHeading heading={str(section.settings, "heading")} align="center" />
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item, i) => (
            <figure key={i} className="flex flex-col rounded-sf border border-sf-line bg-sf-paper p-6">
              <Stars rating={typeof item.rating === "number" ? item.rating : 5} />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-sf-body">“{String(item.quote ?? "")}”</blockquote>
              <figcaption className="mt-5 text-xs text-sf-muted">
                <span className="font-medium text-sf-ink">{String(item.author ?? "")}</span>
                {item.location ? ` · ${String(item.location)}` : ""}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function Newsletter({ section }: { section: SiteSection }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const s = section.settings;

  return (
    <section className="py-14 lg:py-20">
      <Container className="max-w-2xl text-center">
        <h2 className="font-sf-display text-2xl text-sf-ink sm:text-3xl">{str(s, "heading")}</h2>
        {str(s, "body") && <p className="mx-auto mt-3 max-w-md text-sm text-sf-muted">{str(s, "body")}</p>}
        {done ? (
          <p className="mt-7 text-sm font-medium text-sf-ok">Thank you — you are on the list.</p>
        ) : (
          <form
            className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            <label htmlFor={`news-${section.id}`} className="sr-only">
              Email address
            </label>
            <input
              id={`news-${section.id}`}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={str(s, "placeholder", "you@example.in")}
              className={inputClass}
            />
            <SfButton type="submit" className="shrink-0">
              {str(s, "buttonLabel", "Subscribe")}
            </SfButton>
          </form>
        )}
        {str(s, "note") && <p className="mt-4 text-xs text-sf-faint">{str(s, "note")}</p>}
      </Container>
    </section>
  );
}

export function RichText({ section }: { section: SiteSection }) {
  const center = str(section.settings, "align", "left") === "center";
  return (
    <section className="py-12">
      <Container className={cn("max-w-3xl", center && "text-center")}>
        {str(section.settings, "heading") && <h2 className="font-sf-display text-2xl text-sf-ink sm:text-3xl">{str(section.settings, "heading")}</h2>}
        {str(section.settings, "body") && <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-sf-body">{str(section.settings, "body")}</p>}
      </Container>
    </section>
  );
}
