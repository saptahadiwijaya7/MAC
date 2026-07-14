"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Printer,
  Receipt,
  Wallet,
  Boxes,
  TrendingUp,
  ImageOff,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fmtDate, formatNumber, ymd } from "@/lib/utils";
import { useSales } from "@/lib/hooks";

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

function rp(n: number): string {
  return "Rp " + formatNumber(n);
}

export default function SalesPage() {
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState("all");
  const { sales, isLoading: loading, error, mutate } = useSales(fromDate(period) || undefined);
  const load = () => mutate();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sales;
    return sales.filter((s) =>
      (s.item + " " + s.unitId + " " + s.buyer + " " + s.saleId).toLowerCase().includes(needle)
    );
  }, [sales, q]);

  const totals = useMemo(() => {
    const revenue = filtered.reduce((sum, s) => sum + (s.salePrice || 0), 0);
    const count = filtered.length;
    const avg = count ? Math.round(revenue / count) : 0;
    return { revenue, count, avg };
  }, [filtered]);

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "";

  return (
    <>
      <PageHeader
        title="Rekap Jual"
        subtitle="Semua aset yang sudah terjual, beserta pemasukannya."
        action={
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Periode jual:</span>
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
            <MiniStat icon={Wallet} label={`Pemasukan (${periodLabel})`} value={rp(totals.revenue)} tone="text-ok" soft="bg-ok-soft" />
            <MiniStat icon={Boxes} label="Unit terjual" value={formatNumber(totals.count)} tone="text-brand" soft="bg-brand-soft" />
            <MiniStat icon={TrendingUp} label="Rata-rata / unit" value={rp(totals.avg)} tone="text-info" soft="bg-info-soft" />
          </div>

          <Card className="mt-6 overflow-hidden">
            <div className="border-b border-line p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari barang, Unit ID, pembeli, atau No. jual…"
                  className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-400">
                <Receipt className="h-6 w-6" />
                Belum ada penjualan pada periode ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3 font-medium"></th>
                      <th className="px-5 py-3 font-medium">Barang</th>
                      <th className="px-5 py-3 font-medium">Pembeli</th>
                      <th className="px-5 py-3 font-medium">Tanggal</th>
                      <th className="px-5 py-3 font-medium">Harga Jual</th>
                      <th className="px-5 py-3 font-medium">No. Jual</th>
                      <th className="px-5 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((s) => (
                      <tr key={s.saleId} className="hover:bg-slate-50/70">
                        <td className="py-3 pl-5">
                          <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-line bg-surface text-slate-300">
                            {s.proof ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/photo/${encodeURIComponent(s.proof)}`}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageOff className="h-4 w-4" />
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">{s.item}</p>
                          <p className="font-mono text-xs text-slate-400">{s.unitId} · {s.group}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-700">{s.buyer}</td>
                        <td className="px-5 py-3 text-slate-500">{fmtDate(s.saleDate)}</td>
                        <td className="px-5 py-3 font-medium text-slate-900">{rp(s.salePrice)}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{s.saleId}</td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/surat-jual/${encodeURIComponent(s.saleId)}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Surat Jalan
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
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
  icon: typeof Wallet;
  label: string;
  value: string;
  tone: string;
  soft: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${soft} ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-display text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </Card>
  );
}
