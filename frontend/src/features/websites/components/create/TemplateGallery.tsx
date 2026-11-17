"use client";

import Image from "next/image";
import { Check, Eye, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TEMPLATES } from "@/features/storefront/templates";
import type { TemplateManifest } from "@/features/storefront/types";
import { pluralize } from "@/lib/format";

/**
 * The templates a customer can actually build on: the ones with a manifest and a renderer.
 * Adding a second template to the registry puts it here with no change to this file.
 */
export function TemplateGallery({ onPreview, onUse }: { onPreview: (template: TemplateManifest) => void; onUse: (template: TemplateManifest) => void }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {TEMPLATES.map(({ manifest }) => (
        <TemplateGalleryCard key={manifest.id} template={manifest} onPreview={() => onPreview(manifest)} onUse={() => onUse(manifest)} />
      ))}
    </div>
  );
}

export function TemplateGalleryCard({ template, onPreview, onUse }: { template: TemplateManifest; onPreview: () => void; onUse: () => void }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-line-strong">
      <div className="relative aspect-[16/10] border-b border-line bg-subtle">
        <Image src={template.thumbnail} alt={`${template.name} storefront`} fill sizes="(max-width: 768px) 100vw, 380px" className="object-cover" />
        <span className="absolute top-3 left-3">
          <Badge tone="neutral">{template.category === "ecommerce" ? "E-commerce" : "Services"}</Badge>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-heading text-base font-semibold text-ink">{template.name}</h3>
          <p className="mt-1 text-sm text-muted">{template.tagline}</p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <Check className="size-3.5 text-success" aria-hidden />
            {pluralize(template.pages.length, "page")}
          </li>
          <li className="flex items-center gap-1.5">
            <Smartphone className="size-3.5 text-success" aria-hidden />
            Responsive
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="size-3.5 text-success" aria-hidden />
            v{template.version}
          </li>
        </ul>
      </div>
      <div className="flex items-center gap-3 border-t border-line px-5 py-3 max-sm:[&>*]:flex-1">
        <Button variant="secondary" size="sm" leftIcon={<Eye className="size-4" />} onClick={onPreview}>
          Preview
        </Button>
        <Button size="sm" onClick={onUse}>
          Use template
        </Button>
      </div>
    </article>
  );
}
