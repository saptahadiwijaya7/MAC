"use client";

import { use, useEffect, useState } from "react";
import { Printer, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { fetchTransaction } from "@/lib/client-api";
import { BORROW_CHECKLIST } from "@/constants/options";
import type { Transaction } from "@/types/mac";

export default function SuratJalanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [tx, setTx] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchTransaction(decodeURIComponent(id))
      .then((t) => alive && setTx(t))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat surat jalan…
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-danger-soft text-danger">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm text-slate-600">
          {error || "Transaksi tidak ditemukan."}
        </p>
        <Link
          href="/transaction/return"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
      </div>
    );
  }

  const items = tx.items || [];

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      {/* toolbar (screen only) */}
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4">
        <Link
          href="/transaction/borrow"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Printer className="h-4 w-4" /> Cetak / Simpan PDF
        </button>
      </div>

      {/* the sheet */}
      <div className="print-sheet mx-auto max-w-[210mm] bg-white p-[16mm] shadow-pop print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">
              Accurate Marketing
            </h1>
            <p className="text-xs text-slate-500">Marketing Asset Center</p>
          </div>
          <div className="text-right">
            <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
              SURAT PEMINJAMAN BARANG
            </h2>
            <p className="font-mono text-sm text-slate-600">{tx.id}</p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <Row label="Nama Peminjam" value={tx.peminjam} />
          <Row label="Divisi" value={tx.divisi || "-"} />
          <Row label="Tanggal Pinjam" value={fmtDate(tx.tanggalPinjam)} />
          <Row label="Rencana Kembali" value={fmtDate(tx.kembaliRencana)} />
          {tx.kegiatan ? (
            <div className="col-span-2">
              <Row label="Nama Kegiatan" value={tx.kegiatan} />
            </div>
          ) : null}
          {tx.catatan ? (
            <div className="col-span-2">
              <Row label="Catatan" value={tx.catatan} />
            </div>
          ) : null}
        </section>

        <table className="mt-5 w-full border-collapse text-[13px] print:text-xs">
          <thead>
            <tr className="border-y border-slate-300 text-left">
              <th className="w-8 py-1.5 font-semibold">No</th>
              <th className="w-32 py-1.5 font-semibold">Asset No</th>
              <th className="py-1.5 font-semibold">Nama Barang</th>
              <th className="py-1.5 font-semibold">Lokasi Simpan</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.unitId} className="border-b border-slate-200 [break-inside:avoid]">
                <td className="py-1 align-top text-slate-500">{idx + 1}</td>
                <td className="py-1 align-top font-mono text-xs text-slate-700">{it.unitId}</td>
                <td className="py-1 align-top text-slate-800">{it.item}</td>
                <td className="py-1 align-top text-[11px] text-slate-500">
                  {it.lokasi ? `📍 ${it.lokasi}` : "—"}
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">
                  Tidak ada item.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <section className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Checklist
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-slate-700">
            {BORROW_CHECKLIST.map((c) => (
              <span key={c} className="inline-flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 rounded-sm border border-slate-400" />
                {c}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-12 grid grid-cols-2 gap-8 text-sm">
          <SignBlock role="Peminjam" name={tx.peminjam} />
          <SignBlock role="PIC / Petugas" name="" />
        </section>

        <p className="mt-10 text-center text-[10px] text-slate-400">
          {tx.createdBy ? (
            <>Dibuat oleh: {tx.createdBy}<br /></>
          ) : null}
          Dokumen dibuat otomatis oleh Marketing Asset Center · {tx.id}
        </p>
      </div>
    </div>
  );
}

function fmtDate(v: string): string {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">: {value}</span>
    </div>
  );
}

function SignBlock({ role, name }: { role: string; name: string }) {
  return (
    <div className="text-center">
      <p className="text-slate-500">{role}</p>
      <div className="mt-16 border-t border-slate-400 pt-1">
        <span className="text-slate-700">{name || "(………………………)"}</span>
      </div>
    </div>
  );
}
