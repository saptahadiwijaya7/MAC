import { Construction } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon = Construction,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-card px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      <span className="mt-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
        Dijadwalkan di batch berikutnya
      </span>
    </div>
  );
}
