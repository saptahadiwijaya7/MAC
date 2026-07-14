"use client";

import { use, useEffect, useState } from "react";
import { Printer, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { fetchSale } from "@/lib/client-api";
import { formatNumber } from "@/lib/utils";
import type { SaleRecord } from "@/types/mac";

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

export default function SuratJualPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSale(id)
      .then((s) => {
        if (!s) throw new Error("Data penjualan tidak ditemukan.");
        setSale(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
      </div>
    );
  }
  if (error || !sale) {
    return (
      <div className="mx-auto mt-20 max-w-md rounded-2xl bg-danger-soft p-6 text-center text-sm text-danger">
        <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
        {error || "Tidak ada data."}
        <div className="mt-4">
          <Link href="/sales" className="text-brand hover:underline">
            ← Kembali ke Rekap Jual
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[794px] items-center justify-between px-4 print:hidden">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          <Printer className="h-4 w-4" /> Cetak / Simpan PDF
        </button>
      </div>

      <div className="mx-auto max-w-[794px] bg-white p-10 shadow-card print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">Accurate Marketing</h1>
            <p className="text-sm text-brand">Marketing Asset Center</p>
          </div>
          <div className="text-right">
            <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
              SURAT JALAN PENJUALAN ASET
            </h2>
            <p className="font-mono text-sm text-slate-500">{sale.saleId}</p>
          </div>
        </header>

        <div className="mt-4 h-px bg-slate-300" />

        <section className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <Row label="Nama Pembeli" value={sale.buyer || "-"} />
          <Row label="Tanggal Jual" value={fmtDate(sale.saleDate)} />
          <Row label="Grup" value={sale.group || "-"} />
          <Row label="Unit ID" value={sale.unitId} />
        </section>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-300 text-left">
              <th className="w-10 py-2 font-semibold">No</th>
              <th className="w-40 py-2 font-semibold">Asset No / Unit</th>
              <th className="py-2 font-semibold">Nama Barang</th>
              <th className="py-2 text-right font-semibold">Harga Jual</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-2 align-top text-slate-500">1</td>
              <td className="py-2 align-top font-mono text-xs text-slate-700">{sale.unitId}</td>
              <td className="py-2 align-top text-slate-800">{sale.item}</td>
              <td className="py-2 text-right align-top font-medium text-slate-900">
                Rp {formatNumber(sale.salePrice)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="py-2 text-right font-semibold text-slate-700">
                Total
              </td>
              <td className="py-2 text-right font-display text-base font-bold text-slate-900">
                Rp {formatNumber(sale.salePrice)}
              </td>
            </tr>
          </tbody>
        </table>

        {sale.proof ? (
          <section className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bukti Transaksi
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photo/${encodeURIComponent(sale.proof)}`}
              alt="Bukti transaksi"
              className="max-h-64 rounded-lg border border-slate-200 object-contain"
            />
          </section>
        ) : null}

        <section className="mt-12 grid grid-cols-2 gap-8 text-sm">
          <SignBlock role="Penjual / PIC" name="" />
          <SignBlock role="Pembeli" name={sale.buyer} />
        </section>

        <p className="mt-10 text-center text-[10px] text-slate-400">
          {sale.recordedBy ? (
            <>Dibuat oleh: {sale.recordedBy}<br /></>
          ) : null}
          Dokumen dibuat otomatis oleh Marketing Asset Center · {sale.saleId}
        </p>
      </div>
    </div>
  );
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
