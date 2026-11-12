/** Only allow same-origin relative redirects (prevents open redirects through ?next=). */
export const safeNext = (next: string | null | undefined) =>
  next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/websites";
