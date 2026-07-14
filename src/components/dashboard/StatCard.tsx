import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";
import type { StatDatum } from "@/types";

const TONE: Record<StatDatum["tone"], { bar: string; text: string; soft: string }> = {
  brand: { bar: "bg-brand", text: "text-brand", soft: "bg-brand-soft" },
  info: { bar: "bg-info", text: "text-info", soft: "bg-info-soft" },
  ok: { bar: "bg-ok", text: "text-ok", soft: "bg-ok-soft" },
  warn: { bar: "bg-warn", text: "text-warn", soft: "bg-warn-soft" },
  danger: { bar: "bg-danger", text: "text-danger", soft: "bg-danger-soft" },
};

export function StatCard({ stat }: { stat: StatDatum }) {
  const t = TONE[stat.tone];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-card">
      <span className={cn("absolute inset-x-0 top-0 h-1", t.bar)} />
      <p className="text-sm text-slate-500">{stat.label}</p>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900">
        {formatNumber(stat.value)}
      </p>
      <span
        className={cn(
          "mt-3 inline-block rounded-md px-2 py-0.5 text-[11px] font-medium",
          t.soft,
          t.text
        )}
      >
        unit
      </span>
    </div>
  );
}
