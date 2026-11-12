const UNITS = ["bytes", "KB", "MB", "GB", "TB", "PB"];

/** 197568495616 -> "184 GB" (binary units, one decimal under 10). */
export function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 GB";
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < UNITS.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1).replace(/\.0$/, "") : Math.round(v)} ${UNITS[i]}`;
}
