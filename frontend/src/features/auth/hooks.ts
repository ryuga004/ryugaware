"use client";

import { useEffect, useState } from "react";

import { useGetSessionQuery } from "./api";

/**
 * The signed-in user from /auth/me — the single profile read in the app.
 * `user` is null while loading, on error, and for anonymous visitors.
 */
export function useCurrentUser() {
  const { data, isLoading, isError, isFetching, refetch } = useGetSessionQuery();
  return { user: data?.user ?? null, isLoading, isError, isFetching, refetch };
}

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
