"use client";

/**
 * The template's own small UI kit.
 *
 * Deliberately separate from `src/components/ui`: a storefront template does not follow DESIGN.md,
 * it follows its own look (cool neutrals, serif display, 2px corners, `sf-*` tokens). Platform
 * components must never appear inside a storefront, and these must never appear in the admin.
 */
import Image from "next/image";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import type { Product } from "../types";
import { useShop } from "./ShopContext";

/**
 * Pictures inside a storefront come from two places: template assets under /images (optimised by
 * next/image) and customer uploads, which arrive as data URLs the optimiser cannot take.
 */
export function SfImage({
  src,
  alt = "",
  sizes,
  priority,
  className,
}: {
  src: string;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (src.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={cn("absolute inset-0 size-full object-cover", className)} />;
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
}

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1180px] px-4 sm:px-6", className)}>{children}</div>;
}

/** Internal storefront navigation. Keeps a real href while routing through the shop context. */
export function SfLink({
  to,
  className,
  children,
  ...rest
}: { to: string; className?: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const { href, go } = useShop();
  const external = /^https?:\/\//.test(to);
  if (external) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <a
      href={href(to)}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        go(to);
      }}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}

type SfVariant = "solid" | "outline" | "ghost" | "dark";

const VARIANTS: Record<SfVariant, string> = {
  solid: "bg-sf-primary text-white hover:opacity-90",
  outline: "border border-sf-ink text-sf-ink hover:bg-sf-ink hover:text-white",
  ghost: "text-sf-ink underline-offset-4 hover:underline",
  dark: "bg-sf-ink text-white hover:bg-sf-primary",
};

const SF_SIZES = { sm: "h-9 px-4 text-xs", md: "h-11 px-6 text-sm", lg: "h-12 px-8 text-sm" };

const buttonClass = (variant: SfVariant, size: keyof typeof SF_SIZES, full?: boolean, className?: string) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-sf font-medium tracking-wide whitespace-nowrap uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40",
    VARIANTS[variant],
    SF_SIZES[size],
    full && "w-full",
    className,
  );

export function SfButton({
  variant = "solid",
  size = "md",
  full,
  className,
  ...props
}: { variant?: SfVariant; size?: keyof typeof SF_SIZES; full?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={props.type ?? "button"} className={buttonClass(variant, size, full, className)} {...props} />;
}

export function SfButtonLink({
  to,
  variant = "solid",
  size = "md",
  full,
  className,
  children,
}: {
  to: string;
  variant?: SfVariant;
  size?: keyof typeof SF_SIZES;
  full?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <SfLink to={to} className={buttonClass(variant, size, full, className)}>
      {children}
    </SfLink>
  );
}

export function SectionHeading({ heading, subheading, align = "left", action }: { heading?: string; subheading?: string; align?: "left" | "center"; action?: React.ReactNode }) {
  if (!heading && !subheading) return null;
  return (
    <div className={cn("mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", align === "center" && "sm:flex-col sm:items-center")}>
      <div className={cn(align === "center" && "text-center")}>
        {heading && <h2 className="font-sf-display text-2xl leading-tight text-sf-ink sm:text-3xl">{heading}</h2>}
        {subheading && <p className="mt-2 max-w-xl text-sm text-sf-muted">{subheading}</p>}
      </div>
      {action}
    </div>
  );
}

export function Price({ price, compareAt, className }: { price: number; compareAt?: number | null; className?: string }) {
  return (
    <span className={cn("flex items-baseline gap-2", className)}>
      <span className="font-medium text-sf-ink tabular-nums">{formatMoney(price)}</span>
      {compareAt ? <s className="text-xs text-sf-faint tabular-nums">{formatMoney(compareAt)}</s> : null}
    </span>
  );
}

export function Stars({ rating, size = 14, className }: { rating: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          aria-hidden
          className={cn("shrink-0", n <= Math.round(rating) ? "fill-sf-secondary text-sf-secondary" : "text-sf-line")}
        />
      ))}
    </span>
  );
}

export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "sale" | "new" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sf px-2 py-1 text-[10px] font-medium tracking-[0.12em] uppercase",
        tone === "sale" && "bg-sf-sale text-white",
        tone === "new" && "bg-sf-ink text-white",
        tone === "neutral" && "bg-sf-canvas text-sf-body",
      )}
    >
      {children}
    </span>
  );
}

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const onSale = product.compareAtPrice !== null;
  return (
    <article className={cn("group flex flex-col", className)}>
      <SfLink to={`/products/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-sf bg-sf-canvas">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {(onSale || product.tags.includes("new")) && (
          <span className="absolute top-3 left-3">
            {onSale ? <Tag tone="sale">Sale</Tag> : <Tag tone="new">New</Tag>}
          </span>
        )}
      </SfLink>
      <div className="mt-3 flex flex-1 flex-col gap-1">
        <SfLink to={`/products/${product.slug}`} className="text-sm font-medium text-sf-ink hover:underline">
          {product.name}
        </SfLink>
        <p className="line-clamp-1 text-xs text-sf-muted">{product.summary}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <Price price={product.price} compareAt={product.compareAtPrice} />
          <span className="flex items-center gap-1 text-xs text-sf-muted">
            <Star width={12} height={12} aria-hidden className="fill-sf-secondary text-sf-secondary" />
            <span className="tabular-nums">{product.rating.toFixed(1)}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

export function Field({
  label,
  id,
  error,
  children,
  className,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium tracking-wide text-sf-body uppercase">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-sf-sale">{error}</p>}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-sf border border-sf-line bg-sf-paper px-3 text-sm text-sf-ink placeholder:text-sf-faint focus:border-sf-primary focus:outline-none focus-visible:outline-none";
