import { TOP_ASSETS } from "@/data/dummy";

export function TopAssets() {
  const max = Math.max(...TOP_ASSETS.map((a) => a.count));
  return (
    <ul className="space-y-3 px-5 pb-5">
      {TOP_ASSETS.map((a, i) => (
        <li key={a.name} className="flex items-center gap-3">
          <span className="w-5 font-mono text-xs text-slate-400">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="truncate text-sm text-slate-700">{a.name}</span>
              <span className="ml-2 font-mono text-xs text-slate-500">{a.count}x</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.round((a.count / max) * 100)}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
