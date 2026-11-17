"use client";

import { useState } from "react";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { bool, list, str, type LinkItem } from "../../settings";
import type { SiteSection } from "../../types";
import { useShop } from "../ShopContext";
import { Container, SfLink, inputClass } from "../ui";

export function AnnouncementBar({ section }: { section: SiteSection }) {
  const message = str(section.settings, "message");
  const label = str(section.settings, "linkLabel");
  const target = str(section.settings, "linkTarget", "/products");
  if (!message) return null;
  return (
    <div className="bg-sf-dark text-sf-on-dark">
      <Container className="flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-xs">
        <span>{message}</span>
        {label && (
          <SfLink to={target} className="font-medium text-white underline underline-offset-4">
            {label}
          </SfLink>
        )}
      </Container>
    </div>
  );
}

export function Wordmark() {
  const { site } = useShop();
  const { logo, brandName } = site.theme;
  if (logo) {
    // Customer upload: a data URL of unknown size, so next/image is not involved.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt={brandName} className="h-8 w-auto max-w-[160px] object-contain" />;
  }
  return <span className="font-sf-display text-xl tracking-tight text-sf-ink">{brandName}</span>;
}

export function Header({ section }: { section: SiteSection }) {
  const { cartCount, isEnabled, go, setSearch, preview, customer } = useShop();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");

  const items = list<LinkItem>(section.settings, "items").filter((i) => isEnabled(String(i.target ?? "/")));
  const showSearch = bool(section.settings, "showSearch", true);
  const ctaLabel = str(section.settings, "ctaLabel");
  const ctaTarget = str(section.settings, "ctaTarget", "/products");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(term);
    setSearchOpen(false);
    setMenuOpen(false);
    go("/products");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-sf-line bg-sf-paper/95 backdrop-blur">
      <Container className="flex h-16 items-center gap-4">
        <button type="button" className="-ml-1 p-1 text-sf-ink lg:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>

        <SfLink to="/" className="flex items-center">
          <Wordmark />
        </SfLink>

        <nav aria-label="Main" className="ml-6 hidden items-center gap-7 lg:flex">
          {items.map((item, i) => (
            <SfLink key={i} to={String(item.target ?? "/")} className="text-sm text-sf-body transition-colors hover:text-sf-primary">
              {String(item.label ?? "Link")}
            </SfLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {showSearch && (
            <button type="button" className="p-2 text-sf-ink hover:text-sf-primary" aria-label="Search products" aria-expanded={searchOpen} onClick={() => setSearchOpen((o) => !o)}>
              <Search className="size-5" aria-hidden />
            </button>
          )}
          {isEnabled("/account") && (
            <SfLink
              to={customer ? "/account" : "/account/login"}
              className="hidden items-center gap-1.5 p-2 text-sf-ink hover:text-sf-primary sm:inline-flex"
              aria-label={customer ? `Your account, signed in as ${customer.name}` : "Sign in"}
            >
              <UserRound className="size-5" aria-hidden />
              <span className="max-w-24 truncate text-sm">{customer ? customer.name.split(" ")[0] : "Sign in"}</span>
            </SfLink>
          )}
          <SfLink to="/cart" className="relative p-2 text-sf-ink hover:text-sf-primary" aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}>
            <ShoppingBag className="size-5" aria-hidden />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-sf-primary text-[10px] font-medium text-white tabular-nums">
                {cartCount}
              </span>
            )}
          </SfLink>
          {ctaLabel && (
            <SfLink to={ctaTarget} className="ml-2 hidden h-9 items-center rounded-sf bg-sf-primary px-4 text-xs font-medium tracking-wide text-white uppercase hover:opacity-90 sm:inline-flex">
              {ctaLabel}
            </SfLink>
          )}
        </div>
      </Container>

      {searchOpen && (
        <div className="border-t border-sf-line bg-sf-paper">
          <Container className="py-3">
            <form onSubmit={submitSearch} className="flex gap-2">
              <input
                autoFocus={!preview}
                className={inputClass}
                placeholder="Search products"
                aria-label="Search products"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
              <button type="submit" className="h-11 shrink-0 rounded-sf bg-sf-ink px-5 text-xs font-medium tracking-wide text-white uppercase">
                Search
              </button>
            </form>
          </Container>
        </div>
      )}

      {menuOpen && (
        <div className="border-t border-sf-line bg-sf-paper lg:hidden">
          <Container className="flex flex-col py-2">
            {items.map((item, i) => (
              <SfLink key={i} to={String(item.target ?? "/")} onClick={() => setMenuOpen(false)} className="border-b border-sf-line py-3 text-sm text-sf-body last:border-0">
                {String(item.label ?? "Link")}
              </SfLink>
            ))}
            {isEnabled("/account") && (
              <SfLink to={customer ? "/account" : "/account/login"} onClick={() => setMenuOpen(false)} className="py-3 text-sm text-sf-body">
                {customer ? `Your account (${customer.name.split(" ")[0]})` : "Sign in"}
              </SfLink>
            )}
          </Container>
        </div>
      )}
    </header>
  );
}

export function Footer({ section }: { section: SiteSection }) {
  const { site, isEnabled } = useShop();
  const about = str(section.settings, "about");
  const shopLinks = list<LinkItem>(section.settings, "shopLinks").filter((i) => isEnabled(String(i.target ?? "/")));
  const helpLinks = list<LinkItem>(section.settings, "helpLinks").filter((i) => isEnabled(String(i.target ?? "/")));
  const email = str(section.settings, "email");
  const phone = str(section.settings, "phone");
  const note = str(section.settings, "note");

  return (
    <footer className="mt-20 bg-sf-dark text-sf-on-dark">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="font-sf-display text-xl text-white">{site.theme.brandName}</p>
          {about && <p className="mt-3 max-w-sm text-sm leading-relaxed">{about}</p>}
        </div>
        <FooterColumn title="Shop" links={shopLinks} />
        <div>
          <FooterColumn title="Help" links={helpLinks} />
          {(email || phone) && (
            <div className="mt-5 space-y-1 text-sm">
              {email && <p>{email}</p>}
              {phone && <p className="tabular-nums">{phone}</p>}
            </div>
          )}
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © 2026 {site.theme.brandName}. All rights reserved.
          </p>
          {note && <p>{note}</p>}
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: LinkItem[] }) {
  if (links.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium tracking-[0.12em] text-white uppercase">{title}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((link, i) => (
          <li key={i}>
            <SfLink to={String(link.target ?? "/")} className={cn("transition-colors hover:text-white")}>
              {String(link.label ?? "Link")}
            </SfLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
