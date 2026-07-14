type ClassValue = string | false | null | undefined;

/** Tiny className joiner (no dependency). */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Format a number with thousand separators, id-ID style. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

/** Normalise any date value to yyyy-mm-dd in Asia/Jakarta (empty if unparseable). */
export function ymd(v: string | Date): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return typeof v === "string" ? v : "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Human date like "13 Jul 2026" (Asia/Jakarta). */
export function fmtDate(v: string): string {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function todayYMD(): string {
  return ymd(new Date());
}
