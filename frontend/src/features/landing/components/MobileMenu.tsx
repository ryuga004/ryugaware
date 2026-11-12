"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ButtonLink, IconButton } from "@/components/ui/Button";

/** Full-width sheet under the header on small screens. */
export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <IconButton label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </IconButton>
      {open && (
        <div id="mobile-menu" className="animate-fade-in absolute inset-x-0 top-16 border-b border-line bg-page px-5 pb-6 shadow-pop">
          <nav aria-label="Mobile" className="flex flex-col py-2">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-line py-3.5 text-base font-medium text-ink last:border-0">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-2 flex flex-col gap-3">
            <ButtonLink href="/register" size="lg" fullWidth>
              Get started
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" size="lg" fullWidth>
              Log in
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
