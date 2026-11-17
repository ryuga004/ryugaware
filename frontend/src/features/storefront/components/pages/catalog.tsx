"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronRight, Minus, Plus, SlidersHorizontal, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { CATEGORIES, PRODUCTS, categoryById, productBySlug, ratingBreakdown, relatedProducts, reviewsFor } from "../../templates/ecommerce/catalog";
import { useLocalJson } from "../../localStore";
import { bool, num, str } from "../../settings";
import type { Product, SitePage } from "../../types";
import { useShop } from "../ShopContext";
import { Container, Price, ProductCard, SectionHeading, SfButton, SfButtonLink, SfLink, Stars, inputClass } from "../ui";

interface OwnReview {
  author: string;
  rating: number;
  title: string;
  body: string;
  date: string;
}

/** Stable identity so the external-store snapshot does not change between renders. */
const NO_REVIEWS: OwnReview[] = [];

/** Clock reads stay outside components: nothing impure runs during a render. */
const today = () => new Date().toISOString().slice(0, 10);

/* ------------------------------ breadcrumbs ------------------------------ */

export function Breadcrumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-sf-muted">
      {trail.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3 text-sf-faint" aria-hidden />}
          {item.to ? (
            <SfLink to={item.to} className="hover:text-sf-ink hover:underline">
              {item.label}
            </SfLink>
          ) : (
            <span aria-current="page" className="text-sf-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ------------------------------ product listing ------------------------------ */

type SortKey = "featured" | "price-asc" | "price-desc" | "rating";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Best rated" },
];

const PRICE_BANDS = [
  { value: "all", label: "Any price", test: () => true },
  { value: "under-2000", label: "Under ₹2,000", test: (p: Product) => p.price < 2000 },
  { value: "2000-10000", label: "₹2,000 – ₹10,000", test: (p: Product) => p.price >= 2000 && p.price <= 10000 },
  { value: "over-10000", label: "Over ₹10,000", test: (p: Product) => p.price > 10000 },
];

export function ProductListingPage({ page }: { page: SitePage }) {
  const { search: term, setSearch: setTerm } = useShop();
  const [category, setCategory] = useState("all");
  const [band, setBand] = useState("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const [pageIndex, setPageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const showSearch = bool(page.settings, "showSearch", true);
  const showFilters = bool(page.settings, "showFilters", true);
  const perPage = num(page.settings, "perPage", 8);

  const results = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const priceTest = PRICE_BANDS.find((b) => b.value === band)?.test ?? (() => true);
    const list = PRODUCTS.filter((p) => {
      if (needle && !`${p.name} ${p.summary} ${categoryById(p.categoryId)?.name ?? ""}`.toLowerCase().includes(needle)) return false;
      if (category !== "all" && p.categoryId !== category) return false;
      return priceTest(p);
    });
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "rating") sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [term, category, band, sort]);

  const pages = Math.max(1, Math.ceil(results.length / perPage));
  const current = Math.min(pageIndex, pages - 1);
  const shown = results.slice(current * perPage, current * perPage + perPage);
  const filtered = term.trim() !== "" || category !== "all" || band !== "all";

  const reset = () => {
    setTerm("");
    setCategory("all");
    setBand("all");
    setSort("featured");
    setPageIndex(0);
  };

  return (
    <div className="py-10 lg:py-14">
      <Container>
        <Breadcrumbs trail={[{ label: "Home", to: "/" }, { label: page.title }]} />
        <div className="mt-5 mb-8">
          <h1 className="font-sf-display text-3xl text-sf-ink sm:text-4xl">{str(page.settings, "heading", page.title)}</h1>
          {str(page.settings, "intro") && <p className="mt-2 max-w-xl text-sm text-sf-muted">{str(page.settings, "intro")}</p>}
        </div>

        {(showSearch || showFilters) && (
          <div className="mb-8 border-y border-sf-line py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {showSearch && (
                <div className="lg:max-w-xs lg:flex-1">
                  <label htmlFor="sf-search" className="sr-only">Search products</label>
                  <input
                    id="sf-search"
                    className={inputClass}
                    placeholder="Search products"
                    value={term}
                    onChange={(e) => {
                      setTerm(e.target.value);
                      setPageIndex(0);
                    }}
                  />
                </div>
              )}
              {showFilters && (
                <button type="button" onClick={() => setFiltersOpen((o) => !o)} className="inline-flex h-11 items-center gap-2 self-start rounded-sf border border-sf-line px-4 text-sm text-sf-ink lg:hidden" aria-expanded={filtersOpen}>
                  <SlidersHorizontal className="size-4" aria-hidden />
                  Filters
                </button>
              )}
              <div className={cn("flex-col gap-3 lg:ml-auto lg:flex lg:flex-row lg:items-center", filtersOpen ? "flex" : "hidden lg:flex")}>
                {showFilters && (
                  <>
                    <label className="sr-only" htmlFor="sf-category">Category</label>
                    <select
                      id="sf-category"
                      className={cn(inputClass, "lg:w-44")}
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setPageIndex(0);
                      }}
                    >
                      <option value="all">All categories</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <label className="sr-only" htmlFor="sf-price">Price</label>
                    <select
                      id="sf-price"
                      className={cn(inputClass, "lg:w-44")}
                      value={band}
                      onChange={(e) => {
                        setBand(e.target.value);
                        setPageIndex(0);
                      }}
                    >
                      {PRICE_BANDS.map((b) => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                  </>
                )}
                <label className="sr-only" htmlFor="sf-sort">Sort by</label>
                <select id="sf-sort" className={cn(inputClass, "lg:w-48")} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <p className="mb-6 text-xs text-sf-muted">
          {results.length} {results.length === 1 ? "product" : "products"}
          {filtered ? " matching your filters" : ""}
        </p>

        {results.length === 0 ? (
          <div className="rounded-sf border border-sf-line bg-sf-canvas px-6 py-16 text-center">
            <p className="font-sf-display text-xl text-sf-ink">Nothing matched</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-sf-muted">Try a different search, or clear the filters to see everything.</p>
            <SfButton variant="outline" className="mt-6" onClick={reset}>
              Clear filters
            </SfButton>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
            <SfButton variant="outline" size="sm" disabled={current === 0} onClick={() => setPageIndex(current - 1)}>
              Previous
            </SfButton>
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-current={i === current ? "page" : undefined}
                onClick={() => setPageIndex(i)}
                className={cn("size-9 rounded-sf text-sm tabular-nums", i === current ? "bg-sf-ink text-white" : "border border-sf-line text-sf-body hover:border-sf-ink")}
              >
                {i + 1}
              </button>
            ))}
            <SfButton variant="outline" size="sm" disabled={current === pages - 1} onClick={() => setPageIndex(current + 1)}>
              Next
            </SfButton>
          </nav>
        )}
      </Container>
    </div>
  );
}

/* ------------------------------ product detail ------------------------------ */

export function ProductDetailPage({ page, slug }: { page: SitePage; slug: string }) {
  const { addToCart, go, isEnabled } = useShop();
  const product = productBySlug(slug);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  if (!product) return <MissingProduct />;

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants.find((v) => v.inStock) ?? product.variants[0];
  const category = categoryById(product.categoryId);
  const reviews = reviewsFor(product.id);
  const related = relatedProducts(product);
  const lowStock = product.stock <= 20;

  const add = () => {
    if (!variant?.inStock) return;
    addToCart(product.id, variant.id, qty);
    setAdded(true);
  };

  return (
    <div className="py-8 lg:py-12">
      <Container>
        <Breadcrumbs
          trail={[{ label: "Home", to: "/" }, { label: "Products", to: "/products" }, ...(category ? [{ label: category.name, to: "/products" }] : []), { label: product.name }]}
        />

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-sf-lg bg-sf-canvas">
              <Image src={product.images[imageIndex] ?? product.image} alt={product.name} fill priority sizes="(max-width: 1024px) 100vw, 560px" className="object-cover" />
            </div>
            <div className="mt-3 flex gap-3">
              {product.images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === imageIndex}
                  className={cn("relative size-20 overflow-hidden rounded-sf border bg-sf-canvas", i === imageIndex ? "border-sf-ink" : "border-sf-line")}
                >
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h1 className="font-sf-display text-3xl leading-tight text-sf-ink">{product.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Stars rating={product.rating} />
              {isEnabled("/products/x/reviews") ? (
                <SfLink to={`/products/${product.slug}/reviews`} className="text-xs text-sf-muted underline-offset-4 hover:underline">
                  {product.rating.toFixed(1)} · {product.reviewCount} reviews
                </SfLink>
              ) : (
                <span className="text-xs text-sf-muted">{product.rating.toFixed(1)} · {product.reviewCount} reviews</span>
              )}
            </div>

            <div className="mt-5">
              <Price price={product.price} compareAt={product.compareAtPrice} className="text-lg" />
              <p className="mt-1 text-xs text-sf-muted">Inclusive of all taxes</p>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-sf-body">{product.summary}</p>

            <fieldset className="mt-7">
              <legend className="text-xs font-medium tracking-wide text-sf-body uppercase">{product.variantLabel}</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={!v.inStock}
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      "h-10 min-w-12 rounded-sf border px-4 text-sm transition-colors",
                      v.id === variant?.id ? "border-sf-ink bg-sf-ink text-white" : "border-sf-line text-sf-body hover:border-sf-ink",
                      !v.inStock && "cursor-not-allowed text-sf-faint line-through hover:border-sf-line",
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              {!variant?.inStock && <p className="mt-2 text-xs text-sf-sale">That option is out of stock. Pick another.</p>}
            </fieldset>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <div className="flex h-11 items-center rounded-sf border border-sf-line">
                <button type="button" className="px-3 text-sf-body disabled:text-sf-faint" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity">
                  <Minus className="size-4" aria-hidden />
                </button>
                <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{qty}</span>
                <button type="button" className="px-3 text-sf-body disabled:text-sf-faint" onClick={() => setQty((q) => Math.min(10, q + 1))} disabled={qty >= 10} aria-label="Increase quantity">
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
              <SfButton size="lg" className="flex-1" onClick={add} disabled={!variant?.inStock}>
                {str(page.settings, "addToCartLabel", "Add to cart")}
              </SfButton>
            </div>

            {added && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-sf border border-sf-line bg-sf-canvas px-4 py-3 text-sm" role="status">
                <span className="text-sf-ok">Added to your cart.</span>
                <button type="button" className="font-medium text-sf-ink underline underline-offset-4" onClick={() => go("/cart")}>
                  View cart
                </button>
              </div>
            )}

            <p className={cn("mt-4 text-xs", lowStock ? "text-sf-sale" : "text-sf-muted")}>
              {lowStock ? `Only ${product.stock} left in stock` : `In stock · ${product.stock} available`}
            </p>

            <div className="mt-8 border-t border-sf-line pt-6">
              <h2 className="text-xs font-medium tracking-wide text-sf-body uppercase">Description</h2>
              <p className="mt-3 text-sm leading-relaxed text-sf-body">{product.description}</p>
            </div>

            {bool(page.settings, "showSpecs", true) && (
              <div className="mt-6 border-t border-sf-line pt-6">
                <h2 className="text-xs font-medium tracking-wide text-sf-body uppercase">Specifications</h2>
                <dl className="mt-3 divide-y divide-sf-line text-sm">
                  {product.specs.map((spec) => (
                    <div key={spec.label} className="flex justify-between gap-6 py-2">
                      <dt className="text-sf-muted">{spec.label}</dt>
                      <dd className="text-right text-sf-ink">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {bool(page.settings, "showReviews", true) && reviews.length > 0 && (
          <section className="mt-16 border-t border-sf-line pt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-sf-display text-2xl text-sf-ink">Customer reviews</h2>
                <div className="mt-2 flex items-center gap-2">
                  <Stars rating={product.rating} />
                  <span className="text-sm text-sf-muted tabular-nums">{product.rating.toFixed(1)} out of 5 · {product.reviewCount} reviews</span>
                </div>
              </div>
              {isEnabled("/products/x/reviews") && (
                <SfButtonLink to={`/products/${product.slug}/reviews`} variant="outline" size="sm">
                  Read all reviews
                </SfButtonLink>
              )}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {reviews.slice(0, 2).map((r) => (
                <article key={r.id} className="rounded-sf border border-sf-line p-5">
                  <Stars rating={r.rating} />
                  <h3 className="mt-3 text-sm font-medium text-sf-ink">{r.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-sf-body">{r.body}</p>
                  <p className="mt-3 text-xs text-sf-muted">{r.author}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-16 border-t border-sf-line pt-10">
            <SectionHeading heading={str(page.settings, "relatedHeading", "You may also like")} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </div>
  );
}

export function MissingProduct() {
  return (
    <Container className="py-24 text-center">
      <p className="font-sf-display text-2xl text-sf-ink">We couldn’t find that product</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-sf-muted">It may have sold out or been renamed.</p>
      <SfButtonLink to="/products" className="mt-7">
        Browse all products
      </SfButtonLink>
    </Container>
  );
}

/* ------------------------------ reviews page ------------------------------ */

export function ReviewsPage({ page, slug }: { page: SitePage; slug: string }) {
  const { site } = useShop();
  const product = productBySlug(slug);
  const [own, setOwn] = useLocalJson<OwnReview[]>(`ryugaware.reviews.${site.websiteId}.${slug}`, NO_REVIEWS);
  const [form, setForm] = useState({ author: "", rating: 5, title: "", body: "" });
  const [open, setOpen] = useState(false);

  if (!product) return <MissingProduct />;

  const seeded = reviewsFor(product.id);
  const all = [...own.map((r, i) => ({ ...r, id: `own_${i}`, productId: product.id })), ...seeded];
  const average = all.length ? all.reduce((sum, r) => sum + r.rating, 0) / all.length : product.rating;
  const breakdown = ratingBreakdown(all);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOwn([{ ...form, date: today() }, ...own]);
    setForm({ author: "", rating: 5, title: "", body: "" });
    setOpen(false);
  };

  return (
    <div className="py-10 lg:py-14">
      <Container>
        <Breadcrumbs trail={[{ label: "Home", to: "/" }, { label: "Products", to: "/products" }, { label: product.name, to: `/products/${product.slug}` }, { label: "Reviews" }]} />

        <div className="mt-6 flex flex-wrap items-center gap-5 border-b border-sf-line pb-8">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-sf bg-sf-canvas">
            <Image src={product.image} alt="" fill sizes="80px" className="object-cover" />
          </div>
          <div>
            <h1 className="font-sf-display text-2xl text-sf-ink">{str(page.settings, "heading", "Customer reviews")}</h1>
            <SfLink to={`/products/${product.slug}`} className="text-sm text-sf-muted underline-offset-4 hover:underline">
              {product.name}
            </SfLink>
          </div>
        </div>

        <div className="grid gap-10 py-8 lg:grid-cols-[280px_1fr] lg:gap-14">
          <div>
            <p className="font-sf-display text-5xl text-sf-ink tabular-nums">{average.toFixed(1)}</p>
            <Stars rating={average} size={16} className="mt-2" />
            <p className="mt-2 text-xs text-sf-muted">{all.length} {all.length === 1 ? "review" : "reviews"}</p>
            <ul className="mt-5 space-y-2">
              {breakdown.map((row) => (
                <li key={row.stars} className="flex items-center gap-3 text-xs text-sf-muted">
                  <span className="w-10 tabular-nums">{row.stars} star</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sf-canvas">
                    <span className="block h-full rounded-full bg-sf-secondary" style={{ width: `${Math.round(row.share * 100)}%` }} />
                  </span>
                  <span className="w-6 text-right tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
            <SfButton className="mt-6" full onClick={() => setOpen((o) => !o)}>
              {str(page.settings, "writeLabel", "Write a review")}
            </SfButton>
          </div>

          <div>
            {open && (
              <form onSubmit={submit} className="mb-8 rounded-sf border border-sf-line bg-sf-canvas p-5">
                <h2 className="font-sf-display text-lg text-sf-ink">Write a review</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="rv-name" className="text-xs font-medium tracking-wide text-sf-body uppercase">Your name</label>
                    <input id="rv-name" required className={cn(inputClass, "mt-1.5")} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="rv-rating" className="text-xs font-medium tracking-wide text-sf-body uppercase">Rating</label>
                    <select id="rv-rating" className={cn(inputClass, "mt-1.5")} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label htmlFor="rv-title" className="text-xs font-medium tracking-wide text-sf-body uppercase">Title</label>
                  <input id="rv-title" required className={cn(inputClass, "mt-1.5")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="mt-4">
                  <label htmlFor="rv-body" className="text-xs font-medium tracking-wide text-sf-body uppercase">Review</label>
                  <textarea id="rv-body" required rows={4} className={cn(inputClass, "mt-1.5 h-auto py-2")} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                </div>
                <div className="mt-5 flex gap-3">
                  <SfButton type="submit">Submit review</SfButton>
                  <SfButton type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</SfButton>
                </div>
              </form>
            )}

            <ul className="divide-y divide-sf-line">
              {all.map((r) => (
                <li key={r.id} className="py-6 first:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Stars rating={r.rating} />
                    <span className="text-xs text-sf-muted">{r.date}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-medium text-sf-ink">{r.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-sf-body">{r.body}</p>
                  <p className="mt-3 text-xs text-sf-muted">{r.author}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </div>
  );
}

export const priceLabel = (value: number) => formatMoney(value);
export const StarIcon = Star;
