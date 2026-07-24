"use client";

import { useEffect, useMemo, useState } from "react";
import { mutate as globalMutate } from "swr";
import {
  ClipboardCheck,
  ScanLine,
  Search,
  Check,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  PackageX,
  History as HistoryIcon,
  ChevronDown,
  RotateCcw,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { QrScanner } from "@/components/QrScanner";
import { Button } from "@/components/ui/Button";
import { useUnits } from "@/lib/hooks";
import { saveOpname, fetchOpnameList, fetchOpname, type OpnameLog } from "@/lib/client-api";
import { RETURN_CONDITIONS } from "@/constants/options";
import { statusMeta } from "@/lib/unit-status";
import { fmtDate } from "@/lib/utils";
import type { Unit } from "@/types/mac";

type Hasil = "ada" | "hilang";
interface Res {
  hasil: Hasil;
  lokasiBaru?: string;
  kondisiBaru?: string;
}

export default function OpnamePage() {
  const [tab, setTab] = useState<"opname" | "riwayat">("opname");

  return (
    <>
      <PageHeader
        title="Stock Opname"
        subtitle="Cek fisik aset, tandai ada/hilang, lalu simpan hasilnya."
      />
      <div className="mb-4 flex gap-1.5">
        {(["opname", "riwayat"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "rounded-lg bg-ink px-3 py-1.5 text-sm font-medium capitalize text-white"
                : "rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-medium capitalize text-slate-500 hover:bg-slate-50"
            }
          >
            {t === "opname" ? "Opname Baru" : "Riwayat"}
          </button>
        ))}
      </div>

      {tab === "opname" ? <OpnameSession /> : <RiwayatOpname />}
    </>
  );
}

// ---------------- Session ----------------
function OpnameSession() {
  const { units, isLoading } = useUnits();
  const [results, setResults] = useState<Record<string, Res>>({});
  const [q, setQ] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ opnameId: string; ada: number; hilang: number; selisih: number; total: number } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Units expected to be physically present/findable: available, maintenance, lost.
  const toCheck = useMemo(
    () => units.filter((u) => ["available", "maintenance", "lost"].includes(u.status.toLowerCase())),
    [units]
  );
  const borrowedCount = units.filter((u) => u.status.toLowerCase() === "borrowed").length;

  const byId = useMemo(() => {
    const m: Record<string, Unit> = {};
    toCheck.forEach((u) => (m[u.unitId] = u));
    return m;
  }, [toCheck]);

  const checkedCount = Object.keys(results).length;
  const adaCount = Object.values(results).filter((r) => r.hasil === "ada").length;
  const hilangCount = Object.values(results).filter((r) => r.hasil === "hilang").length;

  function mark(unitId: string, hasil: Hasil) {
    setResults((r) => {
      const next = { ...r };
      if (next[unitId]?.hasil === hasil) delete next[unitId];
      else next[unitId] = { ...next[unitId], hasil };
      return next;
    });
  }
  function setCorr(unitId: string, patch: Partial<Res>) {
    setResults((r) => ({ ...r, [unitId]: { ...(r[unitId] || { hasil: "ada" }), ...patch } }));
  }

  function onScan(code: string) {
    const id = code.trim();
    const unit = byId[id];
    if (!unit) {
      setFlash(`✗ ${id} tidak ada di daftar opname`);
      return;
    }
    setResults((r) => ({ ...r, [id]: { ...(r[id] || {}), hasil: "ada" } }));
    setFlash(`✓ ${unit.item} — ditandai ADA`);
  }
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1800);
    return () => clearTimeout(t);
  }, [flash]);

  // group by lokasi
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const map = new Map<string, Unit[]>();
    toCheck
      .filter((u) => !needle || (u.item + " " + u.unitId).toLowerCase().includes(needle))
      .forEach((u) => {
        const key = u.lokasi?.trim() || "(Tanpa lokasi)";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(u);
      });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [toCheck, q]);

  async function finalize() {
    const items = Object.entries(results).map(([unitId, r]) => ({
      unitId,
      hasil: r.hasil,
      lokasiBaru: r.lokasiBaru,
      kondisiBaru: r.kondisiBaru,
    }));
    setSaving(true);
    setErr("");
    try {
      const res = await saveOpname({ catatan: catatan.trim(), items });
      setDone(res);
      setConfirm(false);
      globalMutate((k) => typeof k === "string" && k.startsWith("/api/units"));
      globalMutate("/api/opname");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function resetAll() {
    setResults({});
    setCatatan("");
    setDone(null);
    setErr("");
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ok-soft text-ok">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-slate-900">Opname tersimpan</h2>
        <p className="mt-1 font-mono text-sm text-slate-400">{done.opnameId}</p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Dicek" value={done.total} />
          <Stat label="Ada" value={done.ada} tone="ok" />
          <Stat label="Hilang" value={done.hilang} tone="danger" />
        </div>
        <p className="mt-4 text-sm text-slate-500">
          {done.selisih > 0
            ? `${done.selisih} unit mengalami perubahan (status/lokasi/kondisi) dan sudah diterapkan.`
            : "Tidak ada selisih. Semua sesuai catatan."}
        </p>
        <Button variant="outline" className="mx-auto mt-6" onClick={resetAll}>
          <RotateCcw className="h-4 w-4" /> Opname Baru
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama barang atau Unit ID…"
              className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <Button variant="outline" onClick={() => setScanOpen(true)}>
            <ScanLine className="h-4 w-4" /> Scan QR
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>
            Progres: <b className="text-slate-800">{checkedCount}</b> / {toCheck.length} dicek
          </span>
          <span className="text-ok">Ada {adaCount}</span>
          <span className="text-danger">Hilang {hilangCount}</span>
          {borrowedCount > 0 ? (
            <span className="text-slate-400">· {borrowedCount} sedang dipinjam (di luar, tidak dihitung)</span>
          ) : null}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${toCheck.length ? (checkedCount / toCheck.length) * 100 : 0}%` }}
          />
        </div>
      </Card>

      {flash ? (
        <div className="rounded-xl bg-ink px-4 py-2 text-center text-sm font-medium text-white">
          {flash}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat unit…
        </div>
      ) : (
        groups.map(([lokasi, list]) => (
          <Card key={lokasi} className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line bg-surface/60 px-4 py-2.5">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">{lokasi}</span>
              <span className="text-xs text-slate-400">({list.length})</span>
            </div>
            <ul className="divide-y divide-line">
              {list.map((u) => {
                const r = results[u.unitId];
                const meta = statusMeta(u.status);
                const isLost = u.status.toLowerCase() === "lost";
                return (
                  <li key={u.unitId} className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {u.item}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-400">{u.unitId}</span>
                          {isLost ? (
                            <span className={`rounded px-1.5 text-[10px] font-medium ${meta.cls}`}>
                              tercatat hilang
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          onClick={() => mark(u.unitId, "ada")}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                            r?.hasil === "ada"
                              ? "border-ok bg-ok-soft text-ok"
                              : "border-line bg-card text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" /> Ada
                        </button>
                        <button
                          onClick={() => mark(u.unitId, "hilang")}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                            r?.hasil === "hilang"
                              ? "border-danger bg-danger-soft text-danger"
                              : "border-line bg-card text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          <PackageX className="h-3.5 w-3.5" /> Hilang
                        </button>
                      </div>
                    </div>

                    {r?.hasil === "ada" ? (
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="w-14 shrink-0">Lokasi</span>
                          <input
                            defaultValue={u.lokasi}
                            onChange={(e) =>
                              setCorr(u.unitId, {
                                lokasiBaru: e.target.value === u.lokasi ? undefined : e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-line bg-surface px-2 py-1 text-xs focus:border-brand focus:outline-none"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="w-14 shrink-0">Kondisi</span>
                          <select
                            defaultValue=""
                            onChange={(e) =>
                              setCorr(u.unitId, { kondisiBaru: e.target.value || undefined })
                            }
                            className="w-full rounded-lg border border-line bg-card px-2 py-1 text-xs focus:border-brand focus:outline-none"
                          >
                            <option value="">— tidak berubah —</option>
                            {RETURN_CONDITIONS.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))
      )}

      {/* footer action */}
      <Card className="p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Catatan (opsional)
          </span>
          <input
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="mis. Opname bulanan Juli"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
        </label>
        {err ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {err}
          </div>
        ) : null}
        <Button className="mt-3 w-full" disabled={checkedCount === 0} onClick={() => setConfirm(true)}>
          <ClipboardCheck className="h-4 w-4" />
          Selesaikan & Simpan ({checkedCount} dicek)
        </Button>
      </Card>

      {scanOpen ? (
        <QrScanner
          title="Scan QR Unit"
          hint="Arahkan ke QR berisi Unit ID. Unit yang cocok otomatis ditandai Ada."
          onClose={() => setScanOpen(false)}
          onScan={onScan}
        />
      ) : null}

      {confirm ? (
        <>
          <button className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={() => setConfirm(false)} aria-label="Tutup" />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-4">
            <Card className="p-5">
              <CardHeader title="Simpan hasil opname?" />
              <p className="text-sm text-slate-600">
                {adaCount} ditandai ada, {hilangCount} hilang. Unit hilang akan diset status
                <b> lost</b>; unit &quot;lost&quot; yang ketemu dikembalikan ke <b>available</b>; koreksi
                lokasi/kondisi ikut diterapkan. {toCheck.length - checkedCount} unit belum dicek (tidak
                diubah).
              </p>
              <div className="mt-5 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirm(false)} disabled={saving}>
                  Batal
                </Button>
                <Button className="flex-1" onClick={finalize} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Simpan
                </Button>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ---------------- Riwayat ----------------
function RiwayatOpname() {
  const [logs, setLogs] = useState<OpnameLog[] | null>(null);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, OpnameLog>>({});

  useEffect(() => {
    fetchOpnameList()
      .then(setLogs)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  async function toggle(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!detail[id]) {
      try {
        const d = await fetchOpname(id);
        if (d) setDetail((m) => ({ ...m, [id]: d }));
      } catch {
        /* ignore */
      }
    }
  }

  if (err)
    return (
      <Card className="flex items-start gap-2 p-4 text-sm text-danger">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {err}
      </Card>
    );
  if (!logs)
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat riwayat…
      </div>
    );
  if (logs.length === 0)
    return (
      <Card className="flex flex-col items-center gap-2 py-16 text-sm text-slate-400">
        <HistoryIcon className="h-6 w-6" /> Belum ada opname tersimpan.
      </Card>
    );

  return (
    <div className="space-y-2">
      {logs.map((l) => {
        const id = l["Opname ID"];
        const isOpen = openId === id;
        const d = detail[id];
        return (
          <Card key={id} className="overflow-hidden">
            <button onClick={() => toggle(id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2">
                  <span className="font-mono text-sm font-semibold text-brand">{id}</span>
                  <span className="text-sm text-slate-500">{fmtDate(String(l.Tanggal))}</span>
                </span>
                <span className="text-xs text-slate-400">{l.Operator || "-"}</span>
              </span>
              <span className="shrink-0 text-xs">
                <span className="text-ok">{l.Ada} ada</span> ·{" "}
                <span className="text-danger">{l.Hilang} hilang</span> ·{" "}
                <span className="text-slate-500">{l.Selisih} selisih</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen ? (
              <div className="border-t border-line px-4 py-3">
                {l.Catatan ? <p className="mb-2 text-xs text-slate-500">Catatan: {l.Catatan}</p> : null}
                {!d ? (
                  <p className="text-xs text-slate-400">Memuat detail…</p>
                ) : !d.items || d.items.length === 0 ? (
                  <p className="text-xs text-slate-400">Tidak ada selisih pada opname ini.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {d.items.map((it, idx) => (
                      <li key={idx} className="flex flex-col gap-0.5 rounded-lg bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-slate-700">
                          {it.Item}{" "}
                          <span className="font-mono text-xs text-slate-400">{it["Unit ID"]}</span>
                        </span>
                        <span
                          className={`text-xs ${
                            String(it.Hasil).toLowerCase() === "hilang" ? "text-danger" : "text-slate-500"
                          }`}
                        >
                          {it.Perubahan}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "danger" }) {
  const color = tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : "text-slate-900";
  return (
    <div className="rounded-xl bg-surface p-3">
      <p className={`font-display text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
