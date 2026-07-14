"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Package,
  Search,
  Loader2,
  AlertTriangle,
  Tag,
  RefreshCw,
  X,
  Lock,
  ChevronRight,
  ImageOff,
  CircleCheck,
  Wrench,
  Ban,
  ShoppingBag,
  Plus,
  CheckCircle2,
  ImagePlus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { updateUnit, addAsset, uploadPhoto } from "@/lib/client-api";
import { useSession } from "next-auth/react";
import { roleAtLeast } from "@/lib/roles";
import { useUnits } from "@/lib/hooks";
import { statusMeta, saleLabel } from "@/lib/unit-status";
import type { Unit } from "@/types/mac";

const STATUS_FILTERS = ["all", "available", "borrowed", "maintenance", "lost", "sold"];

export default function AssetsPage() {
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [groupF, setGroupF] = useState("all");
  const [saleOnly, setSaleOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const { data: session } = useSession();
  const isAdmin = roleAtLeast(session?.user?.role, "admin");
  const { units, isLoading: loading, error, mutate } = useUnits();
  const load = () => mutate();

  const groups = useMemo(
    () => ["all", ...Array.from(new Set(units.map((u) => u.group).filter(Boolean))).sort()],
    [units]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return units.filter((u) => {
      if (statusF !== "all" && u.status.toLowerCase() !== statusF) return false;
      if (groupF !== "all" && u.group !== groupF) return false;
      if (saleOnly && !u.sale) return false;
      if (needle && !(u.item + " " + u.unitId).toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [units, q, statusF, groupF, saleOnly]);

  const selected = units.find((u) => u.unitId === selectedId) || null;

  function applyUpdate(unitId: string, patch: Partial<Unit>) {
    mutate(
      (cur) =>
        cur ? { units: cur.units.map((u) => (u.unitId === unitId ? { ...u, ...patch } : u)) } : cur,
      { revalidate: false }
    );
  }

  return (
    <>
      <PageHeader
        title="Asset"
        subtitle="Katalog lengkap semua unit fisik — status live dari Sheet."
        action={
          <>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            {isAdmin ? (
              <Button onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4" />
                Tambah Asset
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4">
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
              className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-slate-700 focus:border-brand focus:outline-none"
            >
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g === "all" ? "Semua group" : g}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusF(s)}
                className={
                  statusF === s
                    ? "rounded-lg bg-ink px-2.5 py-1 text-xs font-medium capitalize text-white"
                    : "rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-medium capitalize text-slate-500 hover:bg-slate-50"
                }
              >
                {s === "all" ? "Semua status" : s === "sold" ? "Terjual" : s}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-line" />
            <button
              onClick={() => setSaleOnly((v) => !v)}
              className={
                saleOnly
                  ? "inline-flex items-center gap-1.5 rounded-lg bg-info px-2.5 py-1 text-xs font-medium text-white"
                  : "inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
              }
            >
              <Tag className="h-3.5 w-3.5" /> Dijual
            </button>
            <span className="ml-auto text-xs text-slate-400">
              {loading ? "memuat…" : `${filtered.length} dari ${units.length} unit`}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat unit…
          </div>
        ) : error ? (
          <div className="m-4 flex items-start gap-2 rounded-xl bg-danger-soft p-4 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {error.message}. Cek <code>MAC_APPS_SCRIPT_URL</code> / <code>MAC_API_TOKEN</code>, dan
              pastikan tab Units sudah di-build.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Unit</th>
                  <th className="px-5 py-3 font-medium">Nama Barang</th>
                  <th className="px-5 py-3 font-medium">Group</th>
                  <th className="px-5 py-3 font-medium">Lokasi</th>
                  <th className="px-5 py-3 font-medium">Dipinjam</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.slice(0, 300).map((u) => {
                  const meta = statusMeta(u.status);
                  const sale = saleLabel(u.sale);
                  return (
                    <tr
                      key={u.unitId}
                      onClick={() => setSelectedId(u.unitId)}
                      className="cursor-pointer hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {u.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/photo/${encodeURIComponent(u.photo)}`}
                              alt=""
                              loading="lazy"
                              className="h-9 w-9 shrink-0 rounded-lg border border-line object-cover"
                            />
                          ) : (
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                              <Package className="h-4 w-4" />
                            </span>
                          )}
                          <span className="font-mono text-xs text-slate-500">{u.unitId}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">{u.item}</td>
                      <td className="px-5 py-3 text-slate-500">{u.group}</td>
                      <td className="px-5 py-3 text-slate-500">{u.lokasi}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">
                        {u.timesBorrowed}x
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.cls}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                          {sale ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-1 text-xs font-medium text-info">
                              <Tag className="h-3 w-3" />
                              {sale}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300">
                        <ChevronRight className="ml-auto h-4 w-4" />
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                      Tidak ada unit cocok.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {filtered.length > 300 ? (
              <p className="border-t border-line py-3 text-center text-xs text-slate-400">
                Menampilkan 300 dari {filtered.length}. Perhalus dengan filter/pencarian.
              </p>
            ) : null}
          </div>
        )}
      </Card>

      {selected ? (
        <UnitDrawer
          unit={selected}
          isAdmin={isAdmin}
          onClose={() => setSelectedId(null)}
          onUpdated={applyUpdate}
        />
      ) : null}

      {showAdd ? (
        <AddAssetModal
          groups={groups.filter((g) => g !== "all")}
          units={units}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            load();
          }}
        />
      ) : null}
    </>
  );
}

// ============================================================
// Add-asset modal
// ============================================================
function suggestNo(group: string, units: Unit[]): string {
  let prefix: string | null = null;
  let max = 0;
  let width = 4;
  const g = group.trim().toLowerCase();
  for (const u of units) {
    if (u.group.trim().toLowerCase() !== g) continue;
    const m = /^([A-Za-z]+)(\d+)/.exec(u.indukNo.trim());
    if (!m) continue;
    if (!prefix) prefix = m[1];
    if (m[1].toUpperCase() === prefix.toUpperCase()) {
      const n = parseInt(m[2], 10);
      if (n > max) max = n;
      if (m[2].length > width) width = m[2].length;
    }
  }
  if (!prefix) return "";
  return prefix + String(max + 1).padStart(width, "0");
}

function AddAssetModal({
  groups,
  units,
  onClose,
  onAdded,
}: {
  groups: string[];
  units: Unit[];
  onClose: () => void;
  onAdded: (no: string) => void;
}) {
  const [group, setGroup] = useState(groups[0] || "");
  const [item, setItem] = useState("");
  const [qty, setQty] = useState(1);
  const [no, setNo] = useState("");
  const [noTouched, setNoTouched] = useState(false);
  const [lokasi, setLokasi] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [hargaBeli, setHargaBeli] = useState("");
  const [remarks, setRemarks] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [warn, setWarn] = useState("");
  const [done, setDone] = useState<{ no: string; units: number } | null>(null);

  const suggested = useMemo(() => suggestNo(group, units), [group, units]);
  const effectiveNo = noTouched ? no : suggested;
  const isNewGroup = !!group && !groups.some((g) => g.toLowerCase() === group.toLowerCase());

  async function submit() {
    setErr("");
    setWarn("");
    if (!group.trim()) return setErr("Group wajib diisi.");
    if (!item.trim()) return setErr("Nama barang wajib diisi.");
    if (isNewGroup && !effectiveNo.trim())
      return setErr("Grup baru: isi 'No' manual (belum ada pola nomor).");
    setBusy(true);
    try {
      const res = await addAsset({
        group: group.trim(),
        item: item.trim(),
        qty,
        no: effectiveNo.trim() || undefined,
        lokasi,
        purchaseDate,
        hargaBeli,
        remarks,
      });
      // attach photo to the first created unit, if provided
      if (photoFile) {
        const unitId = qty === 1 ? res.no : res.no + "-1";
        try {
          const { base64, mimeType } = await compressImage(photoFile);
          await uploadPhoto({ unitId, base64, mimeType });
        } catch {
          setWarn("Asset dibuat, tetapi foto gagal diunggah. Coba lagi dari detail asset.");
        }
      }
      setDone(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-label="Tutup" />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <div className="w-full max-w-lg rounded-2xl bg-card shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-lg font-bold text-slate-900">Tambah Asset</h2>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {done ? (
            <div className="p-8 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ok-soft text-ok">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-slate-900">Asset ditambahkan</h3>
              <p className="mt-1 text-sm text-slate-500">
                No <span className="font-mono font-semibold text-brand">{done.no}</span> ·{" "}
                {done.units} unit dibuat.
              </p>
              {warn ? (
                <p className="mx-auto mt-2 max-w-xs rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
                  {warn}
                </p>
              ) : null}
              <Button className="mx-auto mt-5" onClick={() => onAdded(done.no)}>
                Selesai
              </Button>
            </div>
          ) : (
            <div className="space-y-3 px-5 py-5">
              <label className="block">
                <span className={labelCls}>Group *</span>
                <input
                  list="mac-groups"
                  value={group}
                  onChange={(e) => {
                    setGroup(e.target.value);
                    setNoTouched(false);
                  }}
                  placeholder="mis. Audio Equipment"
                  className={inputCls}
                />
                <datalist id="mac-groups">
                  {groups.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </label>

              <label className="block">
                <span className={labelCls}>Nama Barang *</span>
                <input value={item} onChange={(e) => setItem(e.target.value)} className={inputCls} />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelCls}>Qty</span>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>No {isNewGroup ? "(manual)" : "(otomatis)"}</span>
                  <input
                    value={effectiveNo}
                    onChange={(e) => {
                      setNo(e.target.value);
                      setNoTouched(true);
                    }}
                    placeholder={isNewGroup ? "mis. X0001" : ""}
                    className={`${inputCls} font-mono`}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelCls}>Lokasi</span>
                  <input value={lokasi} onChange={(e) => setLokasi(e.target.value)} className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>Tanggal Beli</span>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className={inputCls}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelCls}>Harga Beli</span>
                  <input
                    type="number"
                    value={hargaBeli}
                    onChange={(e) => setHargaBeli(e.target.value)}
                    placeholder="0"
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>Remarks</span>
                  <input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="mis. SOSMED"
                    className={inputCls}
                  />
                </label>
              </div>

              <label className="block">
                <span className={labelCls}>Foto (opsional)</span>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <ImagePlus className="h-4 w-4" />
                    {photoFile ? "Ganti foto" : "Pilih foto"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {photoFile ? (
                    <span className="truncate text-xs text-slate-500">{photoFile.name}</span>
                  ) : null}
                </div>
                {qty > 1 ? (
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Foto dilampirkan ke unit pertama ({effectiveNo || "…"}-1).
                  </span>
                ) : null}
              </label>

              {qty > 1 ? (
                <p className="text-xs text-slate-400">
                  {qty} unit akan dibuat: {effectiveNo || "…"}-1 … {effectiveNo || "…"}-{qty}
                </p>
              ) : null}

              {err ? (
                <div className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {err}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={onClose} disabled={busy}>
                  Batal
                </Button>
                <Button onClick={submit} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Tambah
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const labelCls =
  "mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400";

/** Downscale + JPEG-compress an image in the browser before upload. */
async function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.8
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas tidak didukung."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      resolve({ base64, mimeType: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca gambar."));
    };
    img.src = url;
  });
}

// ============================================================
// Detail drawer
// ============================================================
function UnitDrawer({
  unit,
  isAdmin,
  onClose,
  onUpdated,
}: {
  unit: Unit;
  isAdmin: boolean;
  onClose: () => void;
  onUpdated: (unitId: string, patch: Partial<Unit>) => void;
}) {
  const [lokasi, setLokasi] = useState(unit.lokasi);
  const [kondisi, setKondisi] = useState(unit.kondisi);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmSold, setConfirmSold] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setPhotoBusy(true);
    setErr("");
    try {
      const { base64, mimeType } = await compressImage(file);
      const res = await uploadPhoto({ unitId: unit.unitId, base64, mimeType });
      onUpdated(unit.unitId, { photo: res.photo });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setPhotoBusy(false);
    }
  }

  useEffect(() => {
    setLokasi(unit.lokasi);
    setKondisi(unit.kondisi);
    setErr("");
    setConfirmSold(false);
  }, [unit.unitId, unit.lokasi, unit.kondisi]);

  const sold = unit.status.toLowerCase() === "sold";
  const borrowed = unit.status.toLowerCase() === "borrowed";
  const meta = statusMeta(unit.status);
  const sale = saleLabel(unit.sale);
  const dirty = lokasi !== unit.lokasi || kondisi !== unit.kondisi;

  async function patch(payload: Partial<Unit> & Record<string, string>) {
    setBusy(true);
    setErr("");
    try {
      await updateUnit({ unitId: unit.unitId, ...payload });
      onUpdated(unit.unitId, payload);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Tutup"
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-pop">
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-400">{unit.unitId}</p>
            <h2 className="truncate font-display text-lg font-bold text-slate-900">
              {unit.item}
            </h2>
            <p className="text-xs text-slate-500">
              {unit.group} · {unit.indukNo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* status + sale badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.cls}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            {sale ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-1 text-xs font-medium text-info">
                <Tag className="h-3 w-3" /> {sale}
              </span>
            ) : null}
            <span className="ml-auto font-mono text-xs text-slate-400">
              {unit.timesBorrowed}x dipinjam
            </span>
          </div>

          {!isAdmin ? (
            <ReadOnlyDetail unit={unit} />
          ) : sold ? (
            <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              Unit ini sudah <b className="mx-1">terjual</b> — statusnya terkunci dan tidak bisa
              diubah lagi.
            </div>
          ) : (
            <>
              {/* status control */}
              <section>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Status
                </p>
                {borrowed ? (
                  <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand">
                    Sedang dipinjam — status dikelola lewat Pengembalian.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <StatusBtn
                      active={unit.status === "available"}
                      icon={CircleCheck}
                      label="Available"
                      onClick={() => patch({ status: "available" })}
                      disabled={busy}
                    />
                    <StatusBtn
                      active={unit.status === "maintenance"}
                      icon={Wrench}
                      label="Maintenance"
                      onClick={() => patch({ status: "maintenance" })}
                      disabled={busy}
                    />
                    <StatusBtn
                      active={unit.status === "lost"}
                      icon={Ban}
                      label="Hilang"
                      onClick={() => patch({ status: "lost" })}
                      disabled={busy}
                    />
                  </div>
                )}
              </section>

              {/* sale toggle */}
              <section>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Penanda Dijual
                </p>
                {unit.sale === "auto" ? (
                  <p className="mb-2 text-xs text-slate-500">
                    Otomatis karena umur ≥ 4 tahun. Masih bisa dipinjam.
                  </p>
                ) : null}
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => patch({ sale: unit.sale ? "" : "manual" })}
                >
                  <Tag className="h-4 w-4" />
                  {unit.sale ? "Batal tandai Dijual" : "Tandai Dijual"}
                </Button>
              </section>

              {/* editable fields */}
              <section className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Lokasi
                  </span>
                  <input
                    value={lokasi}
                    onChange={(e) => setLokasi(e.target.value)}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Kondisi / catatan
                  </span>
                  <textarea
                    value={kondisi}
                    onChange={(e) => setKondisi(e.target.value)}
                    rows={2}
                    placeholder="mis. Rusak, kabel hilang, dsb."
                    className={inputCls}
                  />
                </label>
                <Button
                  disabled={busy || !dirty}
                  onClick={() => patch({ lokasi, kondisi })}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Simpan Perubahan
                </Button>
              </section>

              {/* photo */}
              <section>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Foto
                </p>
                {unit.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/photo/${encodeURIComponent(unit.photo)}`}
                    alt={unit.item}
                    className="mb-2 max-h-56 w-full rounded-xl border border-line object-contain bg-surface"
                  />
                ) : (
                  <div className="mb-2 flex items-center gap-3 rounded-xl border border-dashed border-line bg-surface px-4 py-6 text-sm text-slate-400">
                    <ImageOff className="h-5 w-5" />
                    Belum ada foto.
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {photoBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {photoBusy ? "Mengunggah…" : unit.photo ? "Ganti foto" : "Unggah foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={photoBusy}
                    onChange={onPickPhoto}
                  />
                </label>
                <p className="mt-1 text-[11px] text-slate-400">
                  Foto dikompres otomatis sebelum diunggah ke Google Drive.
                </p>
              </section>

              {/* danger: mark sold */}
              <section className="rounded-xl border border-danger/20 bg-danger-soft/40 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-danger">
                  Tandai Terjual
                </p>
                <p className="mb-2 text-xs text-slate-500">
                  Setelah ditandai terjual, unit keluar dari stok dan statusnya terkunci
                  permanen.
                </p>
                {borrowed ? (
                  <p className="text-xs text-slate-500">
                    Kembalikan dulu sebelum bisa ditandai terjual.
                  </p>
                ) : confirmSold ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setConfirmSold(false)}
                      disabled={busy}
                    >
                      Batal
                    </Button>
                    <button
                      disabled={busy}
                      onClick={() => patch({ status: "sold" })}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger px-3.5 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShoppingBag className="h-4 w-4" />
                      )}
                      Ya, tandai terjual
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmSold(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-card px-3.5 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Tandai Terjual
                  </button>
                )}
              </section>
            </>
          )}

          {err ? (
            <div className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {err}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";

function ReadOnlyDetail({ unit }: { unit: Unit }) {
  return (
    <div className="space-y-4">
      <ReadRow label="Lokasi" value={unit.lokasi || "—"} />
      <ReadRow label="Kondisi / catatan" value={unit.kondisi || "—"} />
      <section>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Foto</p>
        {unit.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photo/${encodeURIComponent(unit.photo)}`}
            alt={unit.item}
            className="max-h-56 w-full rounded-xl border border-line object-contain bg-surface"
          />
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-surface px-4 py-6 text-sm text-slate-400">
            <ImageOff className="h-5 w-5" />
            Belum ada foto.
          </div>
        )}
      </section>
      <p className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-400">
        Tampilan hanya-lihat. Perubahan data aset dilakukan oleh admin.
      </p>
    </div>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="rounded-xl bg-surface px-3 py-2 text-sm text-slate-700">{value}</p>
    </div>
  );
}

function StatusBtn({
  active,
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  icon: typeof CircleCheck;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        active
          ? "flex flex-col items-center gap-1 rounded-xl border border-brand bg-brand-soft px-2 py-2.5 text-xs font-medium text-brand disabled:opacity-50"
          : "flex flex-col items-center gap-1 rounded-xl border border-line bg-card px-2 py-2.5 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
