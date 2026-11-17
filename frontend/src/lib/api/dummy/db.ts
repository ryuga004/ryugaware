/**
 * In-memory "database" for the dummy API.
 *
 * Seed data is loaded once from `public/data/*.json` (fetched like a network call) and then
 * kept in memory so that create / update / delete behave like a real backend until a page reload.
 * Only the dummy handlers touch this module: React components never import JSON or this file.
 *
 * Two collections are also mirrored into localStorage (see `PERSISTED`): a website someone creates
 * in the demo, and its page content. Without that, opening a storefront in a new tab — which is a
 * new document, with a fresh in-memory store — would not find the website that was just created.
 */

import { applyScenario } from "./scenario";

type Envelope<T> = { data: T };

const loading = new Map<string, Promise<unknown>>();
const store = new Map<string, unknown>();

/**
 * Collections that survive a reload, so created websites can be opened in another tab and the
 * choices made in the website editor are still there afterwards. The editor writes a website's
 * payment, delivery and sign-in selection onto these same records, which is why they are here.
 * `db.reset()` clears them, so the demo-data switcher still starts from the seed.
 */
const PERSISTED = new Set(["websites", "site-content", "payment-methods", "delivery-methods", "customer-auth"]);
const storageKey = (file: string) => `ryugaware.demo.${file}`;

function restore<T>(file: string): T | undefined {
  if (!PERSISTED.has(file) || typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(storageKey(file));
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

async function load<T>(file: string): Promise<T> {
  const saved = restore<T>(file);
  if (saved !== undefined) return saved;
  const origin = typeof window === "undefined" ? (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000") : "";
  const res = await fetch(`${origin}/data/${file}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load seed data "${file}" (${res.status})`);
  const json = (await res.json()) as Envelope<T>;
  return applyScenario(file, json.data);
}

async function open<T>(file: string): Promise<T> {
  if (store.has(file)) return store.get(file) as T;
  let pending = loading.get(file) as Promise<T> | undefined;
  if (!pending) {
    pending = load<T>(file).then((value) => {
      store.set(file, value);
      return value;
    });
    loading.set(file, pending);
  }
  try {
    return await pending;
  } finally {
    loading.delete(file);
  }
}

export const db = {
  /** Returns the live, mutable array for a collection file such as "websites". */
  collection: <T>(file: string) => open<T[]>(file),
  /** Returns the live, mutable object for a document file such as "organization". */
  document: <T extends object>(file: string) => open<T>(file),
  /** Writes the persisted collections back to localStorage. Called after every dummy mutation. */
  flush: () => {
    if (typeof window === "undefined") return;
    for (const file of PERSISTED) {
      const value = store.get(file);
      if (value === undefined) continue;
      try {
        window.localStorage.setItem(storageKey(file), JSON.stringify(value));
      } catch {
        /* storage full or unavailable: the demo falls back to memory only */
      }
    }
  },
  /** Clears in-memory and persisted state; the next request reloads the seed JSON. */
  reset: () => {
    store.clear();
    loading.clear();
    if (typeof window === "undefined") return;
    for (const file of PERSISTED) {
      try {
        window.localStorage.removeItem(storageKey(file));
      } catch {
        /* ignore */
      }
    }
  },
};
