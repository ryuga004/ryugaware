/**
 * In-memory "database" for the dummy API.
 *
 * Seed data is loaded once from `public/data/*.json` (fetched like a network call) and then
 * kept in memory so that create / update / delete behave like a real backend until a page reload.
 * Only the dummy handlers touch this module: React components never import JSON or this file.
 */

import { applyScenario } from "./scenario";

type Envelope<T> = { data: T };

const loading = new Map<string, Promise<unknown>>();
const store = new Map<string, unknown>();

async function load<T>(file: string): Promise<T> {
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
  /** Clears in-memory state; the next request reloads the seed JSON. */
  reset: () => {
    store.clear();
    loading.clear();
  },
};
