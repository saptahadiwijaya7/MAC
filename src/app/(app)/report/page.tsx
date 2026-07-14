"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertTriangle,
  RefreshCw,
  Download,
  Printer,
  ArrowUpFromLine,
  PackageOpen,
  Clock,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ymd, todayYMD, fmtDate, formatNumber } from "@/lib/utils";
import type { Unit, Transaction, UsageRow } from "@/types/mac";
import { useUnits, useHistory, useUsage } from "@/lib/hooks";

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

function rankBy(list: Transaction[], key: (t: Transaction) => string) {
  const map = new Map<string, number>();
  list.forEach((t) => {
    const k = (key(t) || "").trim() || "—";
    map.set(k, (map.get(k) || 0) + 1);
  });
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export default function ReportPage() {
  const [period, setPeriod] = useState("all");
  const { units, isLoading: lU, error: eU, mutate: mU } = useUnits();
  const { transactions: tx, isLoading: lT, error: eT, mutate: mT } = useHistory();
  const { usage, isLoading: lUs, error: eUs, mutate: mUs } = useUsage(fromDate(period) || undefined);
  const loading = (lU || lT || lUs) && units.length === 0 && tx.length === 0 && usage.length === 0;
  const error = eU || eT || eUs;
  const load = () => {
    mU();
    mT();
    mUs();
  };

  const today = todayYMD();
  const from = fromDate(period);

  const txInPeriod = useMemo(
    () => (from ? tx.filter((t) => ymd(t.tanggalPinjam) >= from) : tx),
    [tx, from]
  );

  const outstanding = useMemo(
    () =>
      tx
        .filter((t) => t.status.toLowerCase() !== "selesai")
        .sort((a, b) => (ymd(a.kembaliRencana) < ymd(b.kembaliRencana) ? -1 : 1)),
    [tx]
  );

  const summary = useMemo(() => {
    const borrowedUnits = units.filter((u) => u.status.toLowerCase() === "borrowed").length;
    const overdue = outstanding.filter((t) => {
      const r = ymd(t.kembaliRencana);
      return r && r < today;
    }).length;
    return {
      totalTx: txInPeriod.length,
      borrowedUnits,
      outstanding: outstanding.length,
      overdue,
    };
  }, [units, txInPeriod, outstanding, today]);

  const topBarang = useMemo(
    () => [...usage].sort((a, b) => b.count - a.count).slice(0, 8),
    [usage]
  );
  const topPeminjam = useMemo(() => rankBy(txInPeriod, (t) => t.peminjam).slice(0, 8), [txInPeriod]);
  const topDivisi = useMemo(() => rankBy(txInPeriod, (t) => t.divisi).slice(0, 6), [txInPeriod]);

  function exportCSV() {
    const header = ["ID", "Tanggal Pinjam", "Peminjam", "Divisi", "Kegiatan", "Rencana Kembali", "Status"];
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [header.join(",")];
    txInPeriod.forEach((t) =>
      lines.push(
        [t.id, ymd(t.tanggalPinjam), t.peminjam, t.divisi, t.kegiatan, ymd(t.kembaliRencana), t.status]
          .map(esc)
          .join(",")
      )
    );
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-transaksi-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Report"
        subtitle="Analitik: top barang, peminjam & divisi teraktif, dan barang belum kembali."
        action={
          <>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={exportCSV} disabled={loading || txInPeriod.length === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </>
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
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MiniStat icon={ArrowUpFromLine} label="Transaksi (periode)" value={summary.totalTx} tone="text-brand" soft="bg-brand-soft" />
            <MiniStat icon={PackageOpen} label="Sedang dipinjam" value={summary.borrowedUnits} tone="text-info" soft="bg-info-soft" />
            <MiniStat icon={Users} label="Belum kembali" value={summary.outstanding} tone="text-warn" soft="bg-warn-soft" />
            <MiniStat icon={Clock} label="Terlambat" value={summary.overdue} tone="text-danger" soft="bg-danger-soft" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <BarCard title={`Top Barang (${PERIODS.find((p) => p.key === period)?.label})`} data={topBarang.map((t) => ({ label: t.item, count: t.count }))} />
            <BarCard title="Peminjam Teraktif" data={topPeminjam} />
            <BarCard title="Divisi Teraktif" data={topDivisi} />
          </div>

          <Card className="mt-6 overflow-hidden">
            <CardHeader
              title={`Barang Belum Kembali (${outstanding.length})`}
              action={<span className="text-xs text-slate-400">status ≠ selesai</span>}
            />
            {outstanding.length === 0 ? (
              <p className="px-5 pb-6 text-sm text-slate-400">Semua barang sudah kembali. 🎉</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-y border-line text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3 font-medium">ID</th>
                      <th className="px-5 py-3 font-medium">Peminjam</th>
                      <th className="px-5 py-3 font-medium">Pinjam</th>
                      <th className="px-5 py-3 font-medium">Rencana Kembali</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {outstanding.map((t) => {
                      const r = ymd(t.kembaliRencana);
                      const late = r && r < today;
                      return (
                        <tr key={t.id} className={late ? "bg-danger-soft/40" : "hover:bg-slate-50/70"}>
                          <td className="px-5 py-3 font-mono text-xs text-slate-600">{t.id}</td>
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {t.peminjam}
                            {t.divisi ? <span className="ml-1 text-xs font-normal text-slate-400">· {t.divisi}</span> : null}
                          </td>
                          <td className="px-5 py-3 text-slate-500">{fmtDate(t.tanggalPinjam)}</td>
                          <td className="px-5 py-3">
                            <span className={late ? "font-medium text-danger" : "text-slate-500"}>
                              {fmtDate(t.kembaliRencana)}
                            </span>
                            {late ? (
                              <span className="ml-2 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-medium text-white">
                                Terlambat
                              </span>
                            ) : null}
                          </td>
                          <td className="px-5 py-3 capitalize text-slate-600">{t.status}</td>
                          <td className="px-5 py-3 text-right">
                            <Link
                              href={`/surat-jalan/${encodeURIComponent(t.id)}`}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              Surat Jalan
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
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
  icon: typeof Clock;
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

function BarCard({
  title,
  data,
}: {
  title: string;
  data: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <Card>
      <CardHeader title={title} />
      {data.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-slate-400">Belum ada data.</p>
      ) : (
        <ul className="space-y-3 px-5 pb-5">
          {data.map((d, i) => (
            <li key={d.label} className="flex items-center gap-3">
              <span className="w-5 font-mono text-xs text-slate-400">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-slate-700">{d.label}</span>
                  <span className="shrink-0 font-mono text-xs text-slate-500">{d.count}x</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((d.count / max) * 100)}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
