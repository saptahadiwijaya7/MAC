"use client";

import { useMemo, useState } from "react";
import { mutate as globalMutate } from "swr";
import {
  Search,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Tag,
  ImageOff,
  Repeat,
  CalendarClock,
  Wallet,
  X,
  User,
  ImagePlus,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { sellAsset } from "@/lib/client-api";
import { useSession } from "next-auth/react";
import { roleAtLeast } from "@/lib/roles";
import { useUnits } from "@/lib/hooks";
import { fileToCompressedBase64 } from "@/lib/image";
import { statusMeta } from "@/lib/unit-status";
import { formatNumber, fmtDate, todayYMD } from "@/lib/utils";
import type { Unit } from "@/types/mac";

function rp(n: number): string {
  if (!n) return "—";
  return "Rp " + formatNumber(n);
}

function ageInfo(dateStr: string): { months: number; label: string } {
  if (!dateStr) return { months: 0, label: "—" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { months: 0, label: "—" };
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 0) months = 0;
  const y = Math.floor(months / 12);
  const m = months % 12;
  const label = y > 0 ? `${y} thn${m > 0 ? ` ${m} bln` : ""}` : `${m} bln`;
  return { months, label };
}

const SALE_FILTERS = [
  { key: "all", label: "Semua" },
  { key: "auto", label: "Otomatis (≥4 thn)" },
  { key: "manual", label: "Manual" },
];
const SORTS = [
  { key: "age", label: "Umur terlama" },
  { key: "jual", label: "Harga jual tertinggi" },
  { key: "used", label: "Paling sering dipakai" },
];

export default function ReadyDijualPage() {
  const [q, setQ] = useState("");
  const [saleF, setSaleF] = useState("all");
  const [sort, setSort] = useState("age");
  const [selected, setSelected] = useState<Unit | null>(null);
  const { data: session } = useSession();
  const isAdmin = roleAtLeast(session?.user?.role, "admin");
  const { units, isLoading: loading, error, mutate } = useUnits();

  function load() {
    mutate();
    globalMutate((k) => typeof k === "string" && k.startsWith("/api/sales"));
  }

  const forSale = useMemo(
    () => units.filter((u) => u.sale && u.status.toLowerCase() !== "sold"),
    [units]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = forSale.filter((u) => {
      if (saleF !== "all" && u.sale.toLowerCase() !== saleF) return false;
      if (needle && !(u.item + " " + u.unitId + " " + u.group).toLowerCase().includes(needle))
        return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "jual") return b.hargaJual - a.hargaJual;
      if (sort === "used") return b.timesBorrowed - a.timesBorrowed;
      return ageInfo(b.purchaseDate).months - ageInfo(a.purchaseDate).months;
    });
    return list;
  }, [forSale, q, saleF, sort]);

  const totalValue = useMemo(
    () => filtered.reduce((s, u) => s + (u.hargaJual || 0), 0),
    [filtered]
  );

  return (
    <>
      <PageHeader
        title="Ready Dijual"
        subtitle="Unit yang siap dilepas — lengkap dengan umur, pemakaian, dan harga."
        action={
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

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
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 shadow-card sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama barang, Unit ID, atau grup…"
                className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SALE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSaleF(f.key)}
                  className={
                    saleF === f.key
                      ? "rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-white"
                      : "rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-slate-600 focus:border-brand focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-500">
            <span>
              <span className="font-display text-lg font-bold text-slate-900">{filtered.length}</span>{" "}
              unit siap jual
            </span>
            <span>
              Estimasi nilai jual:{" "}
              <span className="font-display text-lg font-bold text-brand">{rp(totalValue)}</span>
            </span>
          </div>

          {filtered.length === 0 ? (
            <Card className="flex flex-col items-center gap-2 py-16 text-sm text-slate-400">
              <Tag className="h-6 w-6" />
              Tidak ada unit yang cocok.
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((u) => (
                <SaleCard key={u.unitId} u={u} onClick={() => setSelected(u)} />
              ))}
            </div>
          )}
        </>
      )}

      {selected ? (
        <SellDrawer
          unit={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onSold={() => {
            setSelected(null);
            load();
          }}
        />
      ) : null}
    </>
  );
}

function SaleCard({ u, onClick }: { u: Unit; onClick: () => void }) {
  const age = ageInfo(u.purchaseDate);
  const st = statusMeta(u.status);
  const saleAuto = u.sale.toLowerCase() === "auto";
  return (
    <button
      onClick={onClick}
      className="group overflow-hidden rounded-2xl border border-line bg-card text-left shadow-card transition-shadow hover:shadow-pop"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
        {u.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photo/${encodeURIComponent(u.photo)}`}
            alt={u.item}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            saleAuto ? "bg-danger text-white" : "bg-brand text-white"
          }`}
        >
          {saleAuto ? "Auto ≥4 thn" : "Dijual"}
        </span>
        <span
          className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}
        >
          {st.label}
        </span>
      </div>

      <div className="p-4">
        <p className="truncate font-display text-sm font-semibold text-slate-900" title={u.item}>
          {u.item}
        </p>
        <p className="mt-0.5 font-mono text-xs text-slate-400">
          {u.unitId} · {u.group}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <Meta icon={CalendarClock} label="Umur" value={age.label} />
          <Meta icon={Repeat} label="Dipakai" value={`${u.timesBorrowed}x`} />
        </div>

        <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Harga beli</p>
            <p className="text-sm text-slate-500 line-through decoration-slate-300">
              {rp(u.hargaBeli)}
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-[11px] uppercase tracking-wide text-slate-400">
              <Wallet className="h-3 w-3" /> Rekom jual
            </p>
            <p className="font-display text-lg font-bold text-brand">{rp(u.hargaJual)}</p>
          </div>
        </div>

        {u.lokasi ? (
          <p className="mt-2 truncate text-[11px] text-slate-400">📍 {u.lokasi}</p>
        ) : null}
        {u.lastBorrowed ? (
          <p className="mt-0.5 text-[11px] text-slate-400">
            Terakhir dipinjam {fmtDate(u.lastBorrowed)}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Repeat;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-surface px-2.5 py-1.5">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-400">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-0.5 font-medium text-slate-700">{value}</p>
    </div>
  );
}

// ============================================================
// Sell drawer
// ============================================================
function SellDrawer({
  unit,
  isAdmin,
  onClose,
  onSold,
}: {
  unit: Unit;
  isAdmin: boolean;
  onClose: () => void;
  onSold: () => void;
}) {
  const [buyer, setBuyer] = useState("");
  const [price, setPrice] = useState(unit.hargaJual ? String(unit.hargaJual) : "");
  const [saleDate, setSaleDate] = useState(todayYMD());
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ saleId: string } | null>(null);
  const age = ageInfo(unit.purchaseDate);

  async function submit() {
    setErr("");
    if (!buyer.trim()) return setErr("Nama pembeli wajib diisi.");
    setBusy(true);
    try {
      let proofBase64: string | undefined;
      let proofMimeType: string | undefined;
      if (proof) {
        const c = await fileToCompressedBase64(proof);
        proofBase64 = c.base64;
        proofMimeType = c.mimeType;
      }
      const res = await sellAsset({
        unitId: unit.unitId,
        buyer: buyer.trim(),
        salePrice: Number(price) || 0,
        saleDate,
        proofBase64,
        proofMimeType,
      });
      setDone({ saleId: res.saleId });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-label="Tutup" />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">Jual Asset</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ok-soft text-ok">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h3 className="mt-4 font-display text-lg font-bold text-slate-900">Asset terjual</h3>
            <p className="mt-1 text-sm text-slate-500">
              {unit.item} · {unit.unitId}
              <br />
              No. penjualan <span className="font-mono font-semibold text-brand">{done.saleId}</span>
            </p>
            <a
              href={`/surat-jual/${encodeURIComponent(done.saleId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              <Printer className="h-4 w-4" />
              Cetak Surat Jalan
            </a>
            <button onClick={onSold} className="mt-3 text-sm text-slate-500 hover:text-slate-700">
              Selesai
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5">
            {/* detail */}
            <div className="flex gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-surface">
                {unit.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/photo/${encodeURIComponent(unit.photo)}`}
                    alt={unit.item}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <ImageOff className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-slate-900">{unit.item}</p>
                <p className="font-mono text-xs text-slate-400">{unit.unitId} · {unit.group}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                  <span>Umur: {age.label}</span>
                  <span>Dipakai: {unit.timesBorrowed}x</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Harga beli: {rp(unit.hargaBeli)}</p>
              </div>
            </div>

            <div className="my-5 h-px bg-line" />

            {/* form */}
            {isAdmin ? (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <User className="h-3.5 w-3.5" /> Nama Pembeli *
                </span>
                <input
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                  placeholder="mis. Budi / PT Sinar"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <Wallet className="h-3.5 w-3.5" /> Harga Jual
                  </span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Rekom: {rp(unit.hargaJual)}
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <CalendarClock className="h-3.5 w-3.5" /> Tanggal Jual
                  </span>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  />
                </label>
              </div>

              <div>
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Foto Bukti Transaksi
                </span>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <ImagePlus className="h-4 w-4" />
                    {proof ? "Ganti foto" : "Pilih foto"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setProof(e.target.files?.[0] || null)}
                    />
                  </label>
                  {proof ? <span className="truncate text-xs text-slate-500">{proof.name}</span> : null}
                </div>
              </div>

              {err ? (
                <div className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {err}
                </div>
              ) : null}

              <p className="rounded-xl bg-warn-soft/60 p-3 text-xs text-slate-500">
                Setelah dijual, unit ini keluar dari stok dan statusnya terkunci permanen sebagai
                <span className="font-medium text-slate-700"> Terjual</span>.
              </p>
            </div>
            ) : (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                Hanya <span className="font-medium text-slate-700">admin</span> yang dapat menjual
                aset. Kamu bisa melihat detailnya di sini.
              </p>
            )}
          </div>
        )}

        {done || !isAdmin ? null : (
          <div className="flex gap-2 border-t border-line p-4">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button className="flex-1" onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
              Jual Asset Ini
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
