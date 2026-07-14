"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Loader2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Boxes,
  Repeat,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fmtDate, formatNumber, ymd } from "@/lib/utils";
import type { Unit, UsageRow } from "@/types/mac";
import { useUnits, useUsage } from "@/lib/hooks";

interface ItemRow {
  item: string;
  group: string;
  unitCount: number;
  count: number;
  last: string;
}

const PERIODS = [
  { key: "3m", label: "3 bulan" },
  { key: "12m", label: "1 tahun" },
  { key: "all", label: "Sepanjang waktu" },
];

function fromDate(period: string): string {
  if (period === "all") return "";
  const d = new Date();
  d.setMonth(d.getMonth() - (period === "3m" ? 3 : 12));
  return ymd(d);
}

export default function TrackingPage() {
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState("all");
  const { units, isLoading: loadingUnits, error: errUnits, mutate: loadUnits } = useUnits();
  const { usage, isLoading: loadingUsage, error: errUsage, mutate: loadUsage } = useUsage(
    fromDate(period) || undefined
  );
  const error = errUnits || errUsage;

  const rows = useMemo<ItemRow[]>(() => {
    // catalogue of items from units (group + unit count)
    const cat = new Map<string, { group: string; unitCount: number }>();
    units.forEach((u) => {
      const c = cat.get(u.item) || { group: u.group, unitCount: 0 };
      c.unitCount += 1;
      cat.set(u.item, c);
    });
    const usageMap = new Map(usage.map((u) => [u.item, u]));
    // union of both (usage may reference items no longer in units)
    const keys = new Set<string>([...cat.keys(), ...usageMap.keys()]);
    const list: ItemRow[] = [];
    keys.forEach((item) => {
      const c = cat.get(item);
      const us = usageMap.get(item);
      list.push({
        item,
        group: c?.group || "",
        unitCount: c?.unitCount || 0,
        count: us?.count || 0,
        last: us?.last || "",
      });
    });
    return list.sort((a, b) => b.count - a.count);
  }, [units, usage]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => (r.item + " " + r.group).toLowerCase().includes(needle));
  }, [rows, q]);

  const totals = useMemo(() => {
    const totalBorrows = rows.reduce((s, r) => s + r.count, 0);
    const uniqueItems = rows.length;
    const neverUsed = rows.filter((r) => r.count === 0).length;
    return { totalBorrows, uniqueItems, neverUsed };
  }, [rows]);

  const top = filtered.filter((r) => r.count > 0).slice(0, 10);
  const maxTop = Math.max(1, ...top.map((t) => t.count));
  const loading = loadingUnits && units.length === 0;
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "";

  return (
    <>
      <PageHeader
        title="Tracking"
        subtitle="Seberapa sering tiap barang dipinjam, berdasarkan periode."
        action={
          <Button variant="outline" onClick={() => { loadUnits(); loadUsage(); }}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Periode:</span>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={
              period === p.key
                ? "rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white"
                : "rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
            }
          >
            {p.label}
          </button>
        ))}
        {loadingUsage ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-2xl bg-danger-soft p-4 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error.message}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MiniStat icon={Repeat} label={`Peminjaman (${periodLabel})`} value={totals.totalBorrows} tone="text-brand" soft="bg-brand-soft" />
            <MiniStat icon={Boxes} label="Jenis barang" value={totals.uniqueItems} tone="text-info" soft="bg-info-soft" />
            <MiniStat icon={TrendingUp} label={`Belum dipinjam (${periodLabel})`} value={totals.neverUsed} tone="text-warn" soft="bg-warn-soft" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader title="Top 10 Paling Sering Dipinjam" />
              {top.length === 0 ? (
                <p className="px-5 pb-6 text-sm text-slate-400">Belum ada peminjaman pada periode ini.</p>
              ) : (
                <ul className="space-y-3 px-5 pb-5">
                  {top.map((r, i) => (
                    <li key={r.item} className="flex items-center gap-3">
                      <span className="w-5 font-mono text-xs text-slate-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="truncate text-sm text-slate-700">{r.item}</span>
                          <span className="shrink-0 font-mono text-xs text-slate-500">{r.count}x</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${Math.round((r.count / maxTop) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="overflow-hidden lg:col-span-3">
              <div className="border-b border-line p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Cari nama barang atau grup…"
                    className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  />
                </div>
              </div>
              <div className="max-h-[28rem] overflow-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3 font-medium">Barang</th>
                      <th className="px-5 py-3 font-medium">Unit</th>
                      <th className="px-5 py-3 font-medium">Dipinjam</th>
                      <th className="px-5 py-3 font-medium">Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((r) => (
                      <tr key={r.item} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">{r.item}</p>
                          <p className="text-xs text-slate-400">{r.group}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{r.unitCount}</td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-slate-700">{formatNumber(r.count)}x</span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {r.last ? fmtDate(r.last) : "—"}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                          Tidak ada barang cocok.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
  soft,
}: {
  icon: typeof Repeat;
  label: string;
  value: number;
  tone: string;
  soft: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${soft} ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-display text-2xl font-bold tracking-tight text-slate-900">
          {formatNumber(value)}
        </p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </Card>
  );
}
