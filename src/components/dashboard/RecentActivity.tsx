import { ArrowUpFromLine, ArrowDownToLine, AlertTriangle } from "lucide-react";
import { RECENT_ACTIVITY } from "@/data/dummy";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/types";

const CONFIG: Record<
  ActivityItem["action"],
  { icon: typeof ArrowUpFromLine; cls: string; verb: string }
> = {
  borrow: { icon: ArrowUpFromLine, cls: "bg-brand-soft text-brand", verb: "meminjam" },
  return: { icon: ArrowDownToLine, cls: "bg-ok-soft text-ok", verb: "mengembalikan" },
  overdue: { icon: AlertTriangle, cls: "bg-danger-soft text-danger", verb: "terlambat" },
};

export function RecentActivity() {
  return (
    <ul className="divide-y divide-line">
      {RECENT_ACTIVITY.map((a) => {
        const c = CONFIG[a.action];
        const Icon = c.icon;
        return (
          <li key={a.id} className="flex items-center gap-3 px-5 py-3">
            <span className={cn("grid h-9 w-9 place-items-center rounded-xl", c.cls)}>
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-700">
                <span className="font-medium text-slate-900">{a.actor}</span>{" "}
                {c.verb}{" "}
                <span className="font-medium text-slate-900">{a.target}</span>
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400">{a.time}</span>
          </li>
        );
      })}
    </ul>
  );
}
