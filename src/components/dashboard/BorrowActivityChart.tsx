export function BorrowActivityChart({
  data,
}: {
  data: { month: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="px-5 pb-5">
      <div className="flex h-48 items-end gap-3">
        {data.map((d) => {
          const h = Math.round((d.count / max) * 100);
          return (
            <div key={d.month} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="group relative w-full rounded-t-md bg-gradient-to-t from-brand to-brand/70 transition-all hover:from-brand-hover"
                  style={{ height: `${Math.max(h, 2)}%` }}
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {d.count}
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-400">{d.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
