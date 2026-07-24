"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft, Loader2, AlertTriangle, Search, CheckSquare, Square } from "lucide-react";
import { fetchUnits } from "@/lib/client-api";
import type { Unit } from "@/types/mac";

export default function LabelsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [groupF, setGroupF] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUnits()
      .then(setUnits)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(
    () => [...new Set(units.map((u) => u.group).filter(Boolean))].sort(),
    [units]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return units.filter((u) => {
      if (groupF !== "all" && u.group !== groupF) return false;
      if (needle && !(u.item + " " + u.unitId).toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [units, q, groupF]);

  const chosen = units.filter((u) => selected.has(u.unitId));

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function selectAllFiltered() {
    setSelected((s) => {
      const n = new Set(s);
      filtered.forEach((u) => n.add(u.unitId));
      return n;
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      {/* toolbar + picker (screen only) */}
      <div className="no-print mx-auto max-w-[210mm] px-4">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/assets"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
          <button
            onClick={() => window.print()}
            disabled={chosen.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            <Printer className="h-4 w-4" /> Cetak {chosen.length} label
          </button>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <h1 className="font-display text-lg font-bold text-slate-900">Cetak Label QR</h1>
          <p className="mb-3 text-sm text-slate-500">
            Pilih unit, lalu cetak. Tiap label berisi QR (isi Unit ID) untuk scan saat opname &
            pengembalian.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama barang atau Unit ID…"
                className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              />
            </div>
            <select
              value={groupF}
              onChange={(e) => setGroupF(e.target.value)}
              className="rounded-xl border border-line bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
            >
              <option value="all">Semua grup</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={selectAllFiltered}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-50"
            >
              <CheckSquare className="h-3.5 w-3.5" /> Pilih semua terfilter ({filtered.length})
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-50"
            >
              <Square className="h-3.5 w-3.5" /> Kosongkan
            </button>
            <span className="text-slate-400">{selected.size} unit dipilih</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat unit…
            </div>
          ) : error ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          ) : (
            <ul className="mt-3 max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line">
              {filtered.map((u) => (
                <li key={u.unitId}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selected.has(u.unitId)}
                      onChange={() => toggle(u.unitId)}
                      className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-800">{u.item}</span>
                      <span className="font-mono text-xs text-slate-400">
                        {u.unitId}
                        {u.lokasi ? ` · ${u.lokasi}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-slate-400">Tidak ada unit cocok.</li>
              ) : null}
            </ul>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-slate-400">
          Preview di bawah adalah yang akan tercetak. Sesuaikan ukuran kertas/label di dialog cetak.
        </p>
      </div>

      {/* print area */}
      <div className="mx-auto mt-4 max-w-[210mm] bg-white p-4 print:mt-0 print:p-0">
        {chosen.length === 0 ? (
          <p className="no-print py-10 text-center text-sm text-slate-400">
            Belum ada unit dipilih.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 print:gap-1.5">
            {chosen.map((u) => (
              <div
                key={u.unitId}
                className="flex items-center gap-2 rounded-lg border border-slate-300 p-2 [break-inside:avoid]"
              >
                <QRCodeSVG value={u.unitId} size={56} level="M" className="shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-bold text-slate-900">{u.unitId}</p>
                  <p className="line-clamp-2 text-[10px] leading-tight text-slate-600">{u.item}</p>
                  <p className="truncate text-[9px] text-slate-400">{u.group}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
