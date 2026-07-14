import { cn } from "@/lib/utils";
import type { AssetStatus } from "@/types";

const MAP: Record<AssetStatus, { label: string; cls: string; dot: string }> = {
  available: { label: "Available", cls: "bg-ok-soft text-ok", dot: "bg-ok" },
  borrowed: { label: "Borrowed", cls: "bg-brand-soft text-brand", dot: "bg-brand" },
  maintenance: { label: "Maintenance", cls: "bg-warn-soft text-warn", dot: "bg-warn" },
  "ready-sale": { label: "Ready Sale", cls: "bg-info-soft text-info", dot: "bg-info" },
  overdue: { label: "Overdue", cls: "bg-danger-soft text-danger", dot: "bg-danger" },
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  const s = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        s.cls
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
