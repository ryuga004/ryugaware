/**
 * Demo-data scenarios for the dummy backend, so every screen can be checked with no data, a few rows,
 * the normal seed and a very large data set without editing JSON.
 *
 * The choice lives in sessionStorage (per tab). Only collections that opt in with `registerScenario`
 * are affected; auth, account, templates and websites always use their normal seed.
 */
export type DataScenario = "normal" | "empty" | "small" | "large";

export const SCENARIOS: { value: DataScenario; label: string; hint: string }[] = [
  { value: "normal", label: "Normal", hint: "The seed data in public/data" },
  { value: "empty", label: "Empty", hint: "Nothing set up yet" },
  { value: "small", label: "Small", hint: "A handful of rows" },
  { value: "large", label: "Large", hint: "Hundreds of rows" },
];

const KEY = "ryugaware.dummy.scenario";

export function getScenario(): DataScenario {
  if (typeof window === "undefined") return "normal";
  try {
    const v = window.sessionStorage.getItem(KEY);
    return v === "empty" || v === "small" || v === "large" ? v : "normal";
  } catch {
    return "normal";
  }
}

export function setScenario(value: DataScenario) {
  if (typeof window === "undefined") return;
  try {
    if (value === "normal") window.sessionStorage.removeItem(KEY);
    else window.sessionStorage.setItem(KEY, value);
  } catch {
    /* storage unavailable: the scenario lasts until the next reload */
  }
}

/** How a seed file is reshaped per scenario. Arrays default to [] / first 3 rows / unchanged. */
export interface ScenarioRule<T> {
  empty?: (seed: T) => T;
  small?: (seed: T) => T;
  large?: (seed: T) => T;
}

const rules = new Map<string, ScenarioRule<unknown>>();

export function registerScenario<T>(file: string, rule: ScenarioRule<T> = {}) {
  rules.set(file, rule as ScenarioRule<unknown>);
}

export function applyScenario<T>(file: string, seed: T): T {
  const rule = rules.get(file);
  const scenario = getScenario();
  if (!rule || scenario === "normal") return seed;
  const fn = rule[scenario];
  if (fn) return fn(seed) as T;
  if (!Array.isArray(seed)) return seed;
  if (scenario === "empty") return [] as T;
  if (scenario === "small") return seed.slice(0, 3) as T;
  return seed;
}
