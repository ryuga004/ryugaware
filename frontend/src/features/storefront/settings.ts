/**
 * Typed reads of a section's saved settings.
 *
 * Settings are `Record<string, unknown>` because their shape comes from the template manifest, not
 * from TypeScript. Sections read them through these helpers so a missing or wrongly typed value
 * (an old section from a previous template version, say) falls back instead of crashing the page.
 */

export const str = (settings: Record<string, unknown>, key: string, fallback = "") => {
  const value = settings[key];
  return typeof value === "string" ? value : fallback;
};

export const num = (settings: Record<string, unknown>, key: string, fallback: number) => {
  const value = settings[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

export const bool = (settings: Record<string, unknown>, key: string, fallback = false) => {
  const value = settings[key];
  return typeof value === "boolean" ? value : fallback;
};

export function list<T extends Record<string, unknown>>(settings: Record<string, unknown>, key: string): T[] {
  const value = settings[key];
  return Array.isArray(value) ? (value.filter((item) => item && typeof item === "object") as T[]) : [];
}

export interface LinkItem extends Record<string, unknown> {
  label?: string;
  target?: string;
}
