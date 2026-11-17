/**
 * Template registry. One entry per platform-owned template; adding a second template means adding
 * its manifest, preset and section components, and listing it here. Nothing else in the feature
 * knows that "Aurelia" exists by name.
 */
import type { TemplateManifest } from "../types";
import { ECOMMERCE_TEMPLATE } from "./ecommerce/manifest";
import { ECOMMERCE_PRESET, type PresetPage, type PresetSection } from "./ecommerce/preset";

export interface TemplateBundle {
  manifest: TemplateManifest;
  preset: { chrome: PresetSection[]; pages: PresetPage[] };
}

export const TEMPLATES: TemplateBundle[] = [{ manifest: ECOMMERCE_TEMPLATE, preset: ECOMMERCE_PRESET }];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.manifest.id === id);
export const getTemplateBySlug = (slug: string) => TEMPLATES.find((t) => t.manifest.slug === slug);

export { ECOMMERCE_TEMPLATE };

/**
 * Whether a website can be opened in the website editor: its template is one we render, or — for
 * the demo websites seeded before this feature existed — it is a store, which the GET backfills
 * from the default e-commerce template.
 */
export const supportsEditor = (templateId: string, type: string) => Boolean(getTemplate(templateId)) || type === "ecommerce";
