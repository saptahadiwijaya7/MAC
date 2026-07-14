"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { mutate as globalMutate } from "swr";
import {
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowDownToLine,
  RotateCcw,
  Clock,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchTransaction, submitReturn } from "@/lib/client-api";
import { RETURN_CONDITIONS } from "@/constants/options";
import { fmtDate } from "@/lib/utils";
import type { Transaction, TransactionItem } from "@/types/mac";

interface RowState {
  selected: boolean;
  kondisi: string;
}

function ReturnInner() {
  const [idInput, setIdInput] = useState("");
  const [tx, setTx] = useState<Transaction | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ returned: number; remaining: number } | null>(null);

  const [openTx, setOpenTx] = useState<Transaction[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadOutstanding = useCallback(() => {
    setLoadingList(true);
    fetch("/api/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "gagal memuat");
        const all = d.transactions as Transaction[];
        const open = all
          .filter((t) => t.status.toLowerCase() !== "selesai")
          .sort((a, b) => (a.id < b.id ? 1 : -1))
          .slice(0, 5);
        setOpenTx(open);
      })
      .catch(() => setOpenTx([]))
      .finally(() => setLoadingList(false));
  }, []);
  useEffect(() => {
    loadOutstanding();
  }, [loadOutstanding]);

  const lookup = useCallback(
    async (idArg?: string) => {
      const id = (idArg ?? idInput).trim();
      if (!id) return;
      setError("");
      setDone(null);
      setTx(null);
      setLoading(true);
      try {
        const t = await fetchTransaction(id);
        const outstanding = (t.items || []).filter((i) => i.statusItem === "dipinjam");
        if (!outstanding.length) {
          setError("Semua unit pada transaksi ini sudah dikembalikan.");
        }
        const init: Record<string, RowState> = {};
        outstanding.forEach((i) => {
          init[i.unitId] = { selected: true, kondisi: "Baik" };
        });
        setRows(init);
        setTx(t);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [idInput]
  );

  const params = useSearchParams();
  const presetDone = useRef(false);
  useEffect(() => {
    const pid = params.get("id");
    if (pid && !presetDone.current) {
      presetDone.current = true;
      setIdInput(pid);
      lookup(pid);
    }
  }, [params, lookup]);

  function pick(t: Transaction) {
    setIdInput(t.id);
    lookup(t.id);
  }

  const outstanding: TransactionItem[] = (tx?.items || []).filter(
    (i) => i.statusItem === "dipinjam"
  );
  const selectedCount = Object.values(rows).filter((r) => r.selected).length;

  async function onSubmit() {
    if (!tx) return;
    const returns = outstanding
      .filter((i) => rows[i.unitId]?.selected)
      .map((i) => ({ unitId: i.unitId, kondisi: rows[i.unitId].kondisi }));
    if (!returns.length) {
      setError("Pilih minimal satu unit untuk dikembalikan.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await submitReturn({ transactionId: tx.id, returns });
      setDone({ returned: res.returned, remaining: res.remaining });
      loadOutstanding();
      globalMutate(
        (k) =>
          typeof k === "string" && (k.startsWith("/api/units") || k.startsWith("/api/history"))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setIdInput("");
    setTx(null);
    setRows({});
    setError("");
    setDone(null);
    loadOutstanding();
  }

  return (
    <>
      <PageHeader
        title="Pengembalian"
        subtitle="Pilih transaksi terbuka di bawah, atau masukkan ID peminjaman."
      />

      <Card className="mx-auto max-w-2xl">
        <CardHeader title="Cari Transaksi" />
        <div className="flex flex-col gap-2 px-5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
              placeholder="BOR-20260710-001"
              className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 font-mono text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <Button onClick={() => lookup()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Cari
          </Button>
        </div>

        <div className="px-5 pb-5 pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            <Clock className="h-3.5 w-3.5" /> Belum dikembalikan
          </p>
          {loadingList ? (
            <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat…
            </div>
          ) : openTx.length === 0 ? (
            <p className="rounded-lg bg-surface px-3 py-2 text-xs text-slate-400">
              Tidak ada transaksi terbuka.
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {openTx.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => pick(t)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50 ${
                      tx?.id === t.id ? "bg-brand-soft/50" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 text-sm">
                        <span className="font-mono font-semibold text-brand">{t.id}</span>
                        <span className="text-slate-700">· {t.peminjam}</span>
                      </span>
                      <span className="text-xs text-slate-400">
                        {fmtDate(t.tanggalPinjam)}
                        {t.status.toLowerCase() === "sebagian kembali" ? " · sebagian kembali" : ""}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {error ? (
        <div className="mx-auto mt-4 flex max-w-2xl items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {done ? (
        <Card className="mx-auto mt-4 max-w-2xl p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ok-soft text-ok">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-bold text-slate-900">
            Pengembalian tercatat
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {done.returned} unit dikembalikan.{" "}
            {done.remaining > 0
              ? `${done.remaining} unit masih dipinjam.`
              : "Transaksi selesai."}
          </p>
          <Button variant="outline" className="mx-auto mt-6" onClick={resetAll}>
            <RotateCcw className="h-4 w-4" />
            Pengembalian Lain
          </Button>
        </Card>
      ) : tx && outstanding.length > 0 ? (
        <Card className="mx-auto mt-4 max-w-2xl">
          <div className="border-b border-line px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-brand">{tx.id}</span>
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
                {tx.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {tx.peminjam}
              {tx.divisi ? ` · ${tx.divisi}` : ""} · pinjam {fmtDate(tx.tanggalPinjam)}
            </p>
          </div>

          <div className="px-5 py-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              Barang yang masih dipinjam ({outstanding.length})
            </p>
            <ul className="space-y-2">
              {outstanding.map((i) => {
                const st = rows[i.unitId] || { selected: false, kondisi: "Baik" };
                return (
                  <li
                    key={i.unitId}
                    className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-center"
                  >
                    <label className="flex flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={st.selected}
                        onChange={(e) =>
                          setRows((r) => ({
                            ...r,
                            [i.unitId]: { ...st, selected: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {i.item}
                        </span>
                        <span className="font-mono text-xs text-slate-400">{i.unitId}</span>
                      </span>
                    </label>
                    <select
                      value={st.kondisi}
                      disabled={!st.selected}
                      onChange={(e) =>
                        setRows((r) => ({
                          ...r,
                          [i.unitId]: { ...st, kondisi: e.target.value },
                        }))
                      }
                      className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:opacity-40 sm:w-40"
                    >
                      {RETURN_CONDITIONS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>

            <p className="mt-3 text-xs text-slate-400">
              Unit dengan kondisi <b>Rusak</b> / <b>Hilang</b> otomatis masuk status
              maintenance dan tidak available untuk dipinjam lagi.
            </p>

            <Button
              onClick={onSubmit}
              disabled={submitting || selectedCount === 0}
              className="mt-4 w-full"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
              {submitting ? "Memproses…" : `Kembalikan ${selectedCount} unit`}
            </Button>
          </div>
        </Card>
      ) : null}
    </>
  );
}

export default function ReturnPage() {
  return (
    <Suspense fallback={null}>
      <ReturnInner />
    </Suspense>
  );
}
