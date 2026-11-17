"use client";

/**
 * Tiny JSON-in-localStorage store for shopper state (cart, orders, reviews someone just wrote).
 *
 * Read through `useSyncExternalStore` rather than an effect: the browser's storage is an external
 * system, the server snapshot is the fallback value, and writes notify every subscriber — so two
 * components reading the same key stay in step, and nothing calls setState from an effect.
 */
import { useCallback, useSyncExternalStore } from "react";

const listeners = new Map<string, Set<() => void>>();
/** Parsed values, so a snapshot keeps its identity between renders. */
const cache = new Map<string, unknown>();

function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let value = fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) value = JSON.parse(raw) as T;
  } catch {
    /* unavailable or corrupt: fall back */
  }
  cache.set(key, value);
  return value;
}

function notify(key: string) {
  listeners.get(key)?.forEach((cb) => cb());
}

export function writeJson(key: string, value: unknown) {
  cache.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the value still lives in memory for this page view */
  }
  notify(key);
}

function subscribeTo(key: string, cb: () => void) {
  const set = listeners.get(key) ?? new Set<() => void>();
  set.add(cb);
  listeners.set(key, set);
  return () => {
    set.delete(cb);
  };
}

/** `[value, setValue]` backed by localStorage. Renders the fallback on the server and first paint. */
export function useLocalJson<T>(key: string, fallback: T): [T, (value: T) => void] {
  const subscribe = useCallback((cb: () => void) => subscribeTo(key, cb), [key]);
  const getSnapshot = useCallback(() => read<T>(key, fallback), [key, fallback]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setValue = useCallback((next: T) => writeJson(key, next), [key]);
  return [value, setValue];
}

/** Clears a key (used when a demo website is deleted). */
export function clearJson(key: string) {
  cache.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  notify(key);
}
