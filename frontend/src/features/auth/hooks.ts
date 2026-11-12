"use client";

import { useEffect, useState } from "react";

/** Seconds remaining until `until` (epoch ms). Ticks once per second; 0 when finished or unset. */
export function useCountdown(until: number | null): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!until) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [until]);

  return until ? remaining : 0;
}

export const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
