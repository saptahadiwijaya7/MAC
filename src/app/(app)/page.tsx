"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpFromLine,
  ArrowDownToLine,
  Clock,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/dashboard/StatCard";
import { BorrowActivityChart } from "@/components/dashboard/BorrowActivityChart";
import { ymd, todayYMD, fmtDate } from "@/lib/utils";
import type { Unit, Transaction } from "@/types/mac";
import type { StatDatum } from "@/types";
import { useUnits, useHistory } from "@/lib/hooks";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function DashboardPage() {
  const { units, isLoading: loadingU, error: errU, mutate: mU } = useUnits();
  const { transactions: tx, isLoading: loadingT, error: errT, mutate: mT } = useHistory();
  const loading = (loadingU || loadingT) && units.length === 0 && tx.length === 0;
  const error = errU || errT;
  const load = () => {
    mU();
    mT();
  };

  const today = todayYMD();

  const stats: StatDatum[] = useMemo(() => {
    const by = (s: string) => units.filter((u) => u.status.toLowerCase() === s).length;
    return [
      { label: "Total Asset", value: units.length, tone: "brand" },
      { label: "Sedang Dipinjam", value: by("borrowed"), tone: "info" },
      { label: "Available", value: by("available"), tone: "ok" },
      { label: "Maintenance", value: by("maintenance"), tone: "warn" },
      { label: "Terjual", value: by("sold"), tone: "danger" },
    ];
  }, [units]);

  const activity = useMemo(() => {
    // last 7 months window ending this month
    const now = new Date();
    const buckets: { key: string; month: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: MONTHS[d.getMonth()], count: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    tx.forEach((t) => {
      const y = ymd(t.tanggalPinjam);
      if (!y) return;
      const d = new Date(y);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(key);
      if (i !== undefined) buckets[i].count++;
    });
    return buckets.map((b) => ({ month: b.month, count: b.count }));
  }, [tx]);

  const todayStats = useMemo(() => {
    let borrowed = 0;
    let returned = 0;
    let overdue = 0;
    tx.forEach((t) => {
      if (ymd(t.tanggalPinjam) === today) borrowed++;
      if (t.kembaliAktual && ymd(t.kembaliAktual) === today) returned++;
      const rencana = ymd(t.kembaliRencana);
      if (t.status !== "selesai" && rencana && rencana < today) overdue++;
    });
    return { borrowed, returned, overdue };
  }, [tx, today]);

  const topAssets = useMemo(() => {
    const map = new Map<string, number>();
    units.forEach((u) => map.set(u.item, (map.get(u.item) || 0) + u.timesBorrowed));
    return [...map.entries()]
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [units]);

  const recent = useMemo(() => tx.slice(0, 6), [tx]);

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Memuat data live…" />
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="flex items-start gap-2 rounded-2xl bg-danger-soft p-4 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {error.message}. Cek koneksi <code>/api/ping</code> dan konfigurasi{" "}
            <code>.env.local</code>.
          </span>
        </div>
      </>
    );
  }

  const maxTop = Math.max(1, ...topAssets.map((t) => t.count));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Ringkasan aktivitas asset marketing — data live."
        action={
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Borrow Activity"
            action={<span className="text-xs text-slate-400">7 bulan terakhir</span>}
          />
          <BorrowActivityChart data={activity} />
        </Card>

        <Card>
          <CardHeader title="Hari Ini" />
          <ul className="space-y-1 px-5 pb-5">
            <TodayRow icon={ArrowUpFromLine} label="Barang dipinjam" value={todayStats.borrowed} cls="text-brand" />
            <TodayRow icon={ArrowDownToLine} label="Barang dikembalikan" value={todayStats.returned} cls="text-ok" />
            <TodayRow icon={Clock} label="Barang terlambat" value={todayStats.overdue} cls="text-danger" />
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Transaksi Terbaru"
            action={
              <Link href="/history" className="text-xs text-brand hover:underline">
                Lihat semua
              </Link>
            }
          />
          {recent.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-slate-400">Belum ada transaksi.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand">
                    <ArrowUpFromLine className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-800">
                      <span className="font-medium text-slate-900">{t.peminjam}</span>
                      {t.kegiatan ? ` · ${t.kegiatan}` : t.divisi ? ` · ${t.divisi}` : ""}
                    </p>
                    <p className="font-mono text-xs text-slate-400">{t.id}</p>
                  </div>
                  <span className="text-xs text-slate-400">{fmtDate(t.tanggalPinjam)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Top Barang Dipinjam" />
          {topAssets.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-slate-400">Belum ada data.</p>
          ) : (
            <ul className="space-y-3 px-5 pb-5">
              {topAssets.map((a, i) => (
                <li key={a.item} className="flex items-center gap-3">
                  <span className="w-5 font-mono text-xs text-slate-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="truncate text-sm text-slate-700">{a.item}</span>
                      <span className="ml-2 font-mono text-xs text-slate-500">{a.count}x</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.round((a.count / maxTop) * 100)}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function TodayRow({
  icon: Icon,
  label,
  value,
  cls,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  cls: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
      <Icon className={`h-5 w-5 ${cls}`} />
      <span className="text-sm text-slate-600">{label}</span>
      <span className="ml-auto font-display text-lg font-bold text-slate-900">{value}</span>
    </li>
  );
}
