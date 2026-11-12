import type { PageMeta, QueryParams } from "../types";

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function randomBetween([min, max]: [number, number]) {
  return Math.round(min + Math.random() * Math.max(0, max - min));
}

export function str(params: QueryParams, key: string): string {
  const v = params[key];
  return v === undefined || v === null ? "" : String(v);
}

export function num(params: QueryParams, key: string, fallback: number): number {
  const n = Number(params[key]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; meta: PageMeta } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    meta: { page: safePage, pageSize, total, totalPages, requestedAt: new Date().toISOString() },
  };
}

export const nowIso = () => new Date().toISOString();

let counter = 0;
/** Generates a backend-looking id such as `web_01JC2K7M4`. */
export function newId(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36).toUpperCase()}${counter.toString(36).toUpperCase()}`;
}
