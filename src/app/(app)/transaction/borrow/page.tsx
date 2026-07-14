"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  X,
  Loader2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowUpFromLine,
  PackageCheck,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchUnits, submitBorrow, fetchConfig } from "@/lib/client-api";
import { mutate as globalMutate } from "swr";
import { isAvailable, statusMeta } from "@/lib/unit-status";
import { DIVISIONS, BORROW_CHECKLIST } from "@/constants/options";
import type { Unit } from "@/types/mac";

export default function BorrowPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");

  const [selected, setSelected] = useState<Unit[]>([]);
  const [peminjam, setPeminjam] = useState("");
  const [divisions, setDivisions] = useState<string[]>(DIVISIONS);
  const [divisi, setDivisi] = useState(DIVISIONS[0]);
  const [kegiatan, setKegiatan] = useState("");
  const [kembaliRencana, setKembaliRencana] = useState("");
  const [catatan, setCatatan] = useState("");
  const [checks, setChecks] = useState<boolean[]>(BORROW_CHECKLIST.map(() => false));

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<{ id: string; count: number } | null>(null);

  function load() {
    setLoading(true);
    setLoadError("");
    fetchUnits()
      .then(setUnits)
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    fetchConfig()
      .then((c) => {
        if (c.divisions && c.divisions.length) {
          setDivisions(c.divisions);
          setDivisi((prev) => (c.divisions.includes(prev) ? prev : c.divisions[0]));
        }
      })
      .catch(() => {
        /* keep fallback DIVISIONS */
      });
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((u) => u.unitId)), [selected]);

  const availableCount = useMemo(
    () => units.filter((u) => isAvailable(u.status)).length,
    [units]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return units
      .filter((u) => !selectedIds.has(u.unitId))
      .filter((u) =>
        !needle
          ? true
          : (u.item + " " + u.unitId + " " + u.group).toLowerCase().includes(needle)
      )
      // available first, then the rest
      .sort((a, b) => Number(isAvailable(b.status)) - Number(isAvailable(a.status)))
      .slice(0, 60);
  }, [units, q, selectedIds]);

  function add(u: Unit) {
    setSelected((s) => [...s, u]);
  }
  function remove(id: string) {
    setSelected((s) => s.filter((u) => u.unitId !== id));
  }

  async function onSubmit() {
    setSubmitError("");
    if (!peminjam.trim()) {
      setSubmitError("Nama peminjam wajib diisi.");
      return;
    }
    if (!selected.length) {
      setSubmitError("Pilih minimal satu unit.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitBorrow({
        peminjam: peminjam.trim(),
        divisi,
        kegiatan: kegiatan.trim(),
        kembaliRencana,
        catatan,
        unitIds: selected.map((u) => u.unitId),
      });
      setResult(res);
      globalMutate(
        (k) =>
          typeof k === "string" && (k.startsWith("/api/units") || k.startsWith("/api/history"))
      );
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setSelected([]);
    setPeminjam("");
    setDivisi(divisions[0] || DIVISIONS[0]);
    setKegiatan("");
    setKembaliRencana("");
    setCatatan("");
    setChecks(BORROW_CHECKLIST.map(() => false));
    setResult(null);
    setSubmitError("");
    load();
  }

  if (result) {
    return (
      <>
        <PageHeader title="Peminjaman" subtitle="Transaksi berhasil dibuat." />
        <Card className="mx-auto max-w-lg p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ok-soft text-ok">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-bold text-slate-900">
            Peminjaman tersimpan
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {result.count} unit dipinjam. ID transaksi:
          </p>
          <p className="mt-2 font-mono text-lg font-semibold text-brand">{result.id}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href={`/surat-jalan/${encodeURIComponent(result.id)}`} target="_blank">
              <Button className="w-full sm:w-auto">
                <Printer className="h-4 w-4" />
                Cetak Surat Jalan
              </Button>
            </Link>
            <Button variant="outline" onClick={resetAll}>
              <Plus className="h-4 w-4" />
              Peminjaman Baru
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Peminjaman"
        subtitle="Pilih unit, isi data peminjam, lalu simpan dan cetak surat jalan."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* left: unit picker */}
        <Card className="lg:col-span-3">
          <CardHeader
            title="Pilih Unit"
            action={
              <span className="text-xs text-slate-400">
                {loading ? "memuat…" : `${units.length} unit · ${availableCount} available`}
              </span>
            }
          />
          <div className="px-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama barang atau Unit ID…"
                className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              />
            </div>
          </div>

          <div className="mt-3 max-h-[420px] overflow-y-auto px-5 pb-5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat unit…
              </div>
            ) : loadError ? (
              <div className="flex items-start gap-2 rounded-xl bg-danger-soft p-4 text-sm text-danger">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Gagal memuat unit: {loadError}. Pastikan <code>MAC_APPS_SCRIPT_URL</code> &{" "}
                  <code>MAC_API_TOKEN</code> sudah diisi di <code>.env.local</code>.
                </span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                Tidak ada unit cocok.
              </p>
            ) : (
              <ul className="space-y-1">
                {filtered.map((u) => {
                  const meta = statusMeta(u.status);
                  const can = isAvailable(u.status);
                  return (
                    <li key={u.unitId}>
                      <button
                        onClick={() => can && add(u)}
                        disabled={!can}
                        className={
                          can
                            ? "group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left hover:border-line hover:bg-slate-50"
                            : "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left opacity-70"
                        }
                        title={can ? "Tambah ke peminjaman" : `Tidak bisa dipinjam (${meta.label})`}
                      >
                        <span
                          className={
                            can
                              ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400 group-hover:bg-brand-soft group-hover:text-brand"
                              : "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-300"
                          }
                        >
                          {can ? <Plus className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">
                            {u.item}
                          </span>
                          <span className="block truncate text-xs text-slate-400">
                            {u.group} · {u.lokasi}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {u.sale ? (
                            <span className="inline-flex items-center rounded-full bg-info-soft px-2 py-0.5 text-[11px] font-medium text-info">
                              Dijual
                            </span>
                          ) : null}
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </span>
                        <span className="hidden font-mono text-xs text-slate-400 sm:block">
                          {u.unitId}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* right: form */}
        <Card className="lg:col-span-2">
          <CardHeader title="Detail Peminjaman" />
          <div className="space-y-4 px-5 pb-5">
            <Field label="Nama Peminjam" required>
              <input
                value={peminjam}
                onChange={(e) => setPeminjam(e.target.value)}
                placeholder="mis. Ahmad"
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Divisi">
                <select
                  value={divisi}
                  onChange={(e) => setDivisi(e.target.value)}
                  className={inputCls}
                >
                  {divisions.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Kembali (rencana)">
                <input
                  type="date"
                  value={kembaliRencana}
                  onChange={(e) => setKembaliRencana(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Nama Kegiatan">
              <input
                value={kegiatan}
                onChange={(e) => setKegiatan(e.target.value)}
                placeholder="mis. Syuting Produk Pronas"
                className={inputCls}
              />
            </Field>

            <Field label="Catatan">
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={2}
                placeholder="Opsional"
                className={inputCls}
              />
            </Field>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Checklist
              </p>
              <div className="space-y-1.5">
                {BORROW_CHECKLIST.map((c, i) => (
                  <label key={c} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={checks[i]}
                      onChange={(e) =>
                        setChecks((arr) => arr.map((v, j) => (j === i ? e.target.checked : v)))
                      }
                      className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            {/* selected units */}
            <div className="rounded-xl border border-line bg-surface p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <PackageCheck className="h-4 w-4 text-brand" />
                Barang dipinjam ({selected.length})
              </div>
              {selected.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400">
                  Belum ada. Pilih dari daftar di kiri.
                </p>
              ) : (
                <ul className="space-y-1">
                  {selected.map((u) => (
                    <li
                      key={u.unitId}
                      className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                        {u.item}
                      </span>
                      <span className="font-mono text-xs text-slate-400">{u.unitId}</span>
                      <button
                        onClick={() => remove(u.unitId)}
                        className="rounded p-0.5 text-slate-400 hover:bg-danger-soft hover:text-danger"
                        aria-label="Hapus"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {submitError ? (
              <div className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {submitError}
              </div>
            ) : null}

            <Button onClick={onSubmit} disabled={submitting} className="w-full">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpFromLine className="h-4 w-4" />
              )}
              {submitting ? "Menyimpan…" : "Simpan Peminjaman"}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label} {required ? <span className="text-danger">*</span> : null}
      </span>
      {children}
    </label>
  );
}
