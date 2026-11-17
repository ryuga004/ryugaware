/**
 * Template → website instance.
 *
 * The one place a preset is read. Everything it produces is a fresh deep copy owned by one website:
 * no object is ever shared between the template and an instance, or between two instances, so
 * editing website A cannot reach website B or the template it came from.
 */
import type { FontPair, SiteContent, SitePage, SiteSection } from "./types";
import { getTemplate } from "./templates";

const clone = <T>(value: T): T =>
  typeof structuredClone === "function" ? structuredClone(value) : (JSON.parse(JSON.stringify(value)) as T);

export interface InstantiateInput {
  websiteId: string;
  templateId: string;
  /** From the branding step of the wizard. */
  brandName: string;
  brandDescription?: string;
  logo?: string | null;
  primary?: string;
  secondary?: string;
  fontPair?: FontPair;
  /** Page keys the customer switched off in the structure step. Required pages are kept regardless. */
  disabledPages?: string[];
  /** Supplied by the caller so nothing calls Date.now() during a render. */
  now: string;
}

export function instantiateSite(input: InstantiateInput): SiteContent {
  const bundle = getTemplate(input.templateId);
  if (!bundle) throw new Error(`Unknown template "${input.templateId}"`);
  const { manifest, preset } = bundle;

  let counter = 0;
  const nextId = () => `sec_${String(++counter).padStart(3, "0")}`;

  const chrome: SiteSection[] = preset.chrome.map((section) => ({
    id: nextId(),
    type: section.type,
    enabled: section.enabled ?? true,
    settings: clone(section.settings),
  }));

  const disabled = new Set(input.disabledPages ?? []);

  const pages: SitePage[] = manifest.pages.map((def) => {
    const seed = preset.pages.find((pp) => pp.key === def.key);
    return {
      id: `pg_${def.key}`,
      key: def.key,
      path: def.path,
      title: seed?.title ?? def.label,
      kind: def.kind,
      enabled: def.required ? true : !disabled.has(def.key) && (seed?.enabled ?? true),
      governedBy: def.governedBy,
      seo: clone(seed?.seo ?? { title: def.label, description: def.description }),
      sections: (seed?.sections ?? []).map((section) => ({
        id: nextId(),
        type: section.type,
        enabled: section.enabled ?? true,
        settings: clone(section.settings),
      })),
      settings: clone(seed?.settings ?? {}),
    };
  });

  return {
    websiteId: input.websiteId,
    templateId: manifest.id,
    templateVersion: manifest.version,
    theme: {
      brandName: input.brandName.trim() || manifest.defaultTheme.brandName,
      brandDescription: input.brandDescription?.trim() || manifest.defaultTheme.brandDescription,
      logo: input.logo ?? null,
      primary: input.primary || manifest.defaultTheme.primary,
      secondary: input.secondary || manifest.defaultTheme.secondary,
      fontPair: input.fontPair ?? manifest.defaultTheme.fontPair,
    },
    chrome,
    pages,
    updatedAt: input.now,
  };
}

/** A throwaway instance used to preview the template itself, before any website exists. */
export function previewSite(templateId: string, now: string): SiteContent {
  const manifest = getTemplate(templateId)?.manifest;
  return instantiateSite({
    websiteId: "preview",
    templateId,
    brandName: manifest?.defaultTheme.brandName ?? "Preview",
    now,
  });
}
