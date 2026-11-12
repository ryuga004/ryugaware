"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export interface BarDatum {
  key: string;
  label: string;
  /** Longer label for the tooltip and table (e.g. "14 Oct" when the axis shows "14"). */
  tooltip?: string;
  value: number;
}

function niceMax(max: number) {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * pow >= max / 4)! * pow;
  return Math.ceil(max / step) * step;
}

/**
 * Single-series column chart (one hue, so no legend). Thin columns with rounded data-ends on a shared
 * baseline, three recessive gridlines, and a hover / focus tooltip per column. A table view is always
 * available for screen readers and for anyone who prefers numbers.
 */
export function ColumnChart({
  data,
  format,
  formatAxis = format,
  caption,
  height = 220,
  className,
}: {
  data: BarDatum[];
  format: (v: number) => string;
  formatAxis?: (v: number) => string;
  caption: string;
  height?: number;
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [asTable, setAsTable] = useState(false);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [max, max / 2, 0];

  return (
    <figure className={cn("min-w-0", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <figcaption className="text-sm font-medium text-ink">{caption}</figcaption>
        <button type="button" onClick={() => setAsTable((v) => !v)} className="text-xs font-medium text-primary hover:underline">
          {asTable ? "View chart" : "View table"}
        </button>
      </div>

      {asTable ? (
        <BarTable data={data} format={format} caption={caption} />
      ) : (
        <div className="flex gap-3" style={{ height }}>
          {/* y axis */}
          <div className="relative w-12 shrink-0 text-right text-[11px] text-muted tabular-nums" aria-hidden>
            {ticks.map((t, i) => (
              <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
                {formatAxis(t)}
              </span>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            {ticks.map((t, i) => (
              <div key={i} aria-hidden className={cn("absolute inset-x-0 h-px", t === 0 ? "bg-line-strong" : "bg-line")} style={{ top: `${(1 - t / max) * 100}%` }} />
            ))}
            <ul className="absolute inset-0 flex items-end gap-0.5" aria-label={caption}>
              {data.map((d) => {
                const h = (d.value / max) * 100;
                const on = active === d.key;
                return (
                  <li key={d.key} className="relative flex h-full min-w-0 flex-1 justify-center">
                    <button
                      type="button"
                      aria-label={`${d.tooltip ?? d.label}: ${format(d.value)}`}
                      onMouseEnter={() => setActive(d.key)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(d.key)}
                      onBlur={() => setActive(null)}
                      className="group flex h-full w-full items-end justify-center rounded-sm outline-none focus-visible:bg-subtle"
                    >
                      <span
                        className={cn("block w-full max-w-7 rounded-t-[4px] transition-colors", on ? "bg-primary-active" : "bg-primary")}
                        style={{ height: d.value > 0 ? `max(${h}%, 2px)` : 0 }}
                      />
                    </button>
                    {on && (
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute z-10 -translate-y-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap shadow-pop"
                        style={{ top: `calc(${100 - h}% - 6px)` }}
                      >
                        <span className="block text-muted">{d.tooltip ?? d.label}</span>
                        <span className="block font-medium text-ink tabular-nums">{format(d.value)}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {!asTable && (
        <div className="mt-2 flex gap-3" aria-hidden>
          <div className="w-12 shrink-0" />
          <div className="flex min-w-0 flex-1 gap-0.5 text-[11px] text-muted">
            {data.map((d, i) => (
              <span key={d.key} className={cn("min-w-0 flex-1 truncate text-center", data.length > 8 && i % 2 === 1 && "max-sm:invisible")}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </figure>
  );
}

/** Horizontal bars for a ranked breakdown (e.g. revenue by payment method). Values are labelled directly. */
export function BarList({ data, format, caption, className }: { data: BarDatum[]; format: (v: number) => string; caption: string; className?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <figure className={cn("min-w-0", className)}>
      <figcaption className="mb-4 text-sm font-medium text-ink">{caption}</figcaption>
      <ul className="flex flex-col gap-3.5">
        {data.map((d) => (
          <li key={d.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-body">{d.label}</span>
              <span className="shrink-0 font-medium text-ink tabular-nums">
                {format(d.value)}
                <span className="ml-1.5 text-xs font-normal text-muted">{total ? `${Math.round((d.value / total) * 100)}%` : "0%"}</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-subtle" aria-hidden>
              <div className="h-2 rounded-full bg-primary" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function BarTable({ data, format, caption }: { data: BarDatum[]; format: (v: number) => string; caption: string }) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-md border border-line">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key} className="border-b border-line last:border-0">
              <th scope="row" className="px-3 py-2 text-left font-normal text-body">
                {d.tooltip ?? d.label}
              </th>
              <td className="px-3 py-2 text-right font-medium text-ink tabular-nums">{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
