/**
 * Pure updates on a website's content draft.
 *
 * Every function returns a new `SiteContent`; nothing mutates in place, so the editor can compare
 * the draft with what was loaded to know whether there is anything to save.
 */
import { getTemplate } from "./templates";
import type { SiteContent, SiteSection, SitePage } from "./types";

const clone = <T>(value: T): T => (typeof structuredClone === "function" ? structuredClone(value) : (JSON.parse(JSON.stringify(value)) as T));

const mapPage = (site: SiteContent, pageKey: string, fn: (page: SitePage) => SitePage): SiteContent => ({
  ...site,
  pages: site.pages.map((p) => (p.key === pageKey ? fn(p) : p)),
});

const mapSections = (sections: SiteSection[], sectionId: string, fn: (section: SiteSection) => SiteSection) =>
  sections.map((s) => (s.id === sectionId ? fn(s) : s));

export const setThemeValue = (site: SiteContent, key: string, value: unknown): SiteContent => ({
  ...site,
  theme: { ...site.theme, [key]: value },
});

export const setChromeValue = (site: SiteContent, sectionId: string, key: string, value: unknown): SiteContent => ({
  ...site,
  chrome: mapSections(site.chrome, sectionId, (s) => ({ ...s, settings: { ...s.settings, [key]: value } })),
});

export const setPageSetting = (site: SiteContent, pageKey: string, key: string, value: unknown): SiteContent =>
  mapPage(site, pageKey, (p) => ({ ...p, settings: { ...p.settings, [key]: value } }));

export const setPageSeo = (site: SiteContent, pageKey: string, key: "title" | "description", value: string): SiteContent =>
  mapPage(site, pageKey, (p) => ({ ...p, seo: { ...p.seo, [key]: value } }));

export const setPageEnabled = (site: SiteContent, pageKey: string, enabled: boolean): SiteContent =>
  mapPage(site, pageKey, (p) => ({ ...p, enabled }));

export const setSectionValue = (site: SiteContent, pageKey: string, sectionId: string, key: string, value: unknown): SiteContent =>
  mapPage(site, pageKey, (p) => ({ ...p, sections: mapSections(p.sections, sectionId, (s) => ({ ...s, settings: { ...s.settings, [key]: value } })) }));

export const setSectionEnabled = (site: SiteContent, pageKey: string, sectionId: string, enabled: boolean): SiteContent =>
  mapPage(site, pageKey, (p) => ({ ...p, sections: mapSections(p.sections, sectionId, (s) => ({ ...s, enabled })) }));

export const removeSection = (site: SiteContent, pageKey: string, sectionId: string): SiteContent =>
  mapPage(site, pageKey, (p) => ({ ...p, sections: p.sections.filter((s) => s.id !== sectionId) }));

export function moveSection(site: SiteContent, pageKey: string, sectionId: string, by: 1 | -1): SiteContent {
  return mapPage(site, pageKey, (page) => {
    const index = page.sections.findIndex((s) => s.id === sectionId);
    const target = index + by;
    if (index < 0 || target < 0 || target >= page.sections.length) return page;
    const sections = [...page.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    return { ...page, sections };
  });
}

/** A new section starts from the template's own defaults for that type, so it is never blank. */
export function defaultSettingsFor(templateId: string, type: string): Record<string, unknown> {
  const bundle = getTemplate(templateId);
  if (!bundle) return {};
  for (const page of bundle.preset.pages) {
    const match = page.sections?.find((s) => s.type === type);
    if (match) return clone(match.settings);
  }
  const def = bundle.manifest.sections[type];
  return Object.fromEntries(
    (def?.fields ?? []).map((field) => {
      if (field.type === "boolean") return [field.key, true];
      if (field.type === "number") return [field.key, field.min ?? 4];
      if (field.type === "list") return [field.key, []];
      if (field.type === "select") return [field.key, field.choices?.[0]?.value ?? ""];
      return [field.key, ""];
    }),
  );
}

export function addSection(site: SiteContent, pageKey: string, type: string, nextId: string): SiteContent {
  const section: SiteSection = { id: nextId, type, enabled: true, settings: defaultSettingsFor(site.templateId, type) };
  return mapPage(site, pageKey, (p) => ({ ...p, sections: [...p.sections, section] }));
}

/** Ids only need to be unique inside one website. */
export function nextSectionId(site: SiteContent): string {
  const used = [...site.chrome, ...site.pages.flatMap((p) => p.sections)].map((s) => s.id);
  let n = used.length + 1;
  while (used.includes(`sec_${String(n).padStart(3, "0")}`)) n += 1;
  return `sec_${String(n).padStart(3, "0")}`;
}

/** Fills the placeholder segments of a template path so the preview can show a real page. */
export const previewPathFor = (path: string) => path.replace(":slug", "ecru-heavyweight-tee").replace(":orderNumber", "AUR-DEMO01");
