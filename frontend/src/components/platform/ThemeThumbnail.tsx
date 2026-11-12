import { cn } from "@/lib/cn";

interface Palette {
  hero: string;
  accent: string;
  tiles: [string, string, string, string];
}

/** Flat, brand-neutral placeholder of a storefront, keyed by template theme. No images required. */
const PALETTES: Record<string, Palette> = {
  classic_store: { hero: "#efe7dc", accent: "#1f2937", tiles: ["#d6c7b2", "#c9b79c", "#e2d6c6", "#bfae95"] },
  modern_boutique: { hero: "#f4e4e6", accent: "#7c3a55", tiles: ["#e8c9cf", "#d9aeb7", "#f0d9dc", "#cfa0aa"] },
  fresh_market: { hero: "#e3f0e1", accent: "#2f6b3a", tiles: ["#b9d8b3", "#9cc795", "#cfe5cb", "#f2d49b"] },
  studio_pro: { hero: "#e7e4f2", accent: "#4a3f8f", tiles: ["#cfc9e6", "#b7aedb", "#dcd8ee", "#9d93cf"] },
  clinic_care: { hero: "#dfeef0", accent: "#1f6f78", tiles: ["#b8dadf", "#9ccbd2", "#cfe6e9", "#7db8c1"] },
  bistro_table: { hero: "#f2e3d0", accent: "#8a4b1f", tiles: ["#e5c7a4", "#d6aa7c", "#eed7bd", "#c28f5f"] },
};

export function ThemeThumbnail({ theme, muted, className }: { theme: string; muted?: boolean; className?: string }) {
  const p = PALETTES[theme] ?? PALETTES.classic_store;
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="Website preview" preserveAspectRatio="xMidYMid slice" className={cn("block w-full", muted && "opacity-40", className)}>
      <rect width="320" height="200" fill="#ffffff" />
      <rect width="320" height="22" fill="#ffffff" />
      <rect x="12" y="8" width="38" height="6" rx="1" fill={p.accent} />
      <rect x="120" y="9" width="22" height="4" rx="1" fill="#d4d4d8" />
      <rect x="150" y="9" width="22" height="4" rx="1" fill="#d4d4d8" />
      <rect x="180" y="9" width="22" height="4" rx="1" fill="#d4d4d8" />
      <rect x="296" y="7" width="12" height="8" rx="2" fill="none" stroke={p.accent} strokeWidth="1.5" />
      <rect y="22" width="320" height="1" fill="#ede7e0" />
      <rect y="23" width="320" height="88" fill={p.hero} />
      <rect x="176" y="23" width="144" height="88" fill={p.tiles[1]} />
      <circle cx="248" cy="67" r="30" fill={p.tiles[0]} />
      <rect x="16" y="44" width="92" height="9" rx="1.5" fill="#18181b" />
      <rect x="16" y="58" width="64" height="9" rx="1.5" fill="#18181b" />
      <rect x="16" y="76" width="42" height="13" rx="2" fill={p.accent} />
      {p.tiles.map((c, i) => (
        <g key={i}>
          <rect x={12 + i * 77} y="122" width="69" height="56" rx="2" fill={c} />
          <rect x={12 + i * 77} y="184" width="44" height="4" rx="1" fill="#d4d4d8" />
        </g>
      ))}
    </svg>
  );
}
