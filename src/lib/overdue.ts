import type { Transaction } from "@/types/mac";

export type OverdueLevel = "late" | "soon" | "ok";

export interface OverdueInfo {
  level: OverdueLevel;
  daysLate: number; // >0 late, 0 due today, <0 days remaining
  deadline: Date | null;
  hasPlan: boolean; // true when kembaliRencana was set
  open: boolean;
}

function parseYMD(s: string | undefined | null): Date | null {
  if (!s) return null;
  const str = String(s).trim();
  if (!str) return null;
  // Accept "YYYY-MM-DD" (and ISO). Fall back to Date parsing.
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function todayLocal(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

const DAY = 86400000;

/**
 * Hybrid overdue logic:
 *  - If a return date (kembaliRencana) was set, the deadline is that date.
 *  - Otherwise the deadline is tanggalPinjam + overdueDays (aging fallback).
 * Only open transactions (status != selesai) can be late/soon.
 */
export function overdueInfo(t: Transaction, overdueDays: number): OverdueInfo {
  const open = (t.status || "").toLowerCase() !== "selesai";
  const plan = parseYMD(t.kembaliRencana);
  const start = parseYMD(t.tanggalPinjam);
  const hasPlan = !!plan;

  let deadline: Date | null = plan;
  if (!deadline && start) deadline = new Date(start.getTime() + overdueDays * DAY);

  if (!open || !deadline) {
    return { level: "ok", daysLate: 0, deadline, hasPlan, open };
  }

  const daysLate = Math.round((todayLocal().getTime() - deadline.getTime()) / DAY);
  let level: OverdueLevel = "ok";
  if (daysLate >= 1) level = "late";
  else if (daysLate >= -2) level = "soon"; // due today or within 2 days

  return { level, daysLate, deadline, hasPlan, open };
}

export function overdueText(info: OverdueInfo): string {
  if (info.level === "late") return `Terlambat ${info.daysLate} hari`;
  if (info.level === "soon") {
    if (info.daysLate === 0) return "Jatuh tempo hari ini";
    return `Jatuh tempo ${Math.abs(info.daysLate)} hari lagi`;
  }
  return "";
}
