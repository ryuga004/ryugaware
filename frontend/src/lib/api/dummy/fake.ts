/**
 * Deterministic fake-data helpers for the "Large" demo scenario. A seeded generator means the same
 * rows come back every time, so screenshots and tests are stable.
 */

/** The dummy backend's "today". Dates in generated data are spread backwards from here. */
export const DEMO_NOW = Date.UTC(2026, 10, 12, 10, 30);

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  const next = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    pick: <T>(list: readonly T[]) => list[Math.floor(next() * list.length)]!,
    /** Picks by weight, e.g. weighted([["paid", 8], ["failed", 1]]). */
    weighted: <T>(entries: readonly (readonly [T, number])[]) => {
      const total = entries.reduce((n, [, w]) => n + w, 0);
      let r = next() * total;
      for (const [v, w] of entries) {
        r -= w;
        if (r <= 0) return v;
      }
      return entries[entries.length - 1]![0];
    },
    chance: (p: number) => next() < p,
  };
}

/** ISO timestamp `minutesAgo` before DEMO_NOW. */
export const isoAgo = (minutesAgo: number) => new Date(DEMO_NOW - minutesAgo * 60_000).toISOString();

export const FIRST_NAMES = [
  "Aarav", "Diya", "Kabir", "Ananya", "Vihaan", "Isha", "Arjun", "Meera", "Rohan", "Saanvi", "Ishaan", "Priya",
  "Aditya", "Kavya", "Reyansh", "Nisha", "Dev", "Tara", "Kunal", "Zoya", "Neel", "Riya", "Vikram", "Aisha",
] as const;

export const LAST_NAMES = [
  "Mehta", "Sharma", "Iyer", "Kapoor", "Reddy", "Nair", "Gupta", "Bose", "Khan", "Das", "Menon", "Joshi",
  "Patel", "Singh", "Rao", "Chopra", "Pillai", "Verma", "Malhotra", "Sethi",
] as const;

export const CITIES = [
  ["Mumbai", "Maharashtra"], ["Bengaluru", "Karnataka"], ["Delhi", "Delhi"], ["Pune", "Maharashtra"],
  ["Chennai", "Tamil Nadu"], ["Hyderabad", "Telangana"], ["Kolkata", "West Bengal"], ["Jaipur", "Rajasthan"],
  ["Ahmedabad", "Gujarat"], ["Kochi", "Kerala"], ["Lucknow", "Uttar Pradesh"], ["Indore", "Madhya Pradesh"],
] as const;

/** Upper-case alphanumeric code of `length`, e.g. reference ids. */
export function code(r: ReturnType<typeof rng>, length: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[r.int(0, chars.length - 1)]).join("");
}
