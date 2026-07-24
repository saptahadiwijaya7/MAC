"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { mutate as globalMutate } from "swr";
import {
  Search,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Printer,
  History,
  Pencil,
  Trash2,
  X,
  Plus,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fmtDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { roleAtLeast } from "@/lib/roles";
import { useHistory } from "@/lib/hooks";
import {
  fetchTransaction,
  fetchUnits,
  fetchConfig,
  updateTransaction,
  deleteTransaction,
} from "@/lib/client-api";
import type { Transaction, TransactionItem, Unit } from "@/types/mac";

const STATUS_FILTERS = ["all", "dipinjam", "sebagian kembali", "selesai"];

function txStatusMeta(s: string) {
  switch (s.trim().toLowerCase()) {
    case "selesai":
      return { cls: "bg-ok-soft text-ok", dot: "bg-ok" };
    case "sebagian kembali":
      return { cls: "bg-warn-soft text-warn", dot: "bg-warn" };
    case "dipinjam":
      return { cls: "bg-brand-soft text-brand", dot: "bg-brand" };
    default:
      return { cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" };
  }
}

function HistoryInner() {
  const { transactions: tx, isLoading: loading, error, mutate } = useHistory();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [statusF, setStatusF] = useState("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: session } = useSession();
  const canEdit = roleAtLeast(session?.user?.role, "user");
  const isAdmin = roleAtLeast(session?.user?.role, "admin");

  // refresh history + any units-derived views after a write
  function refreshAll() {
    mutate();
    globalMutate((k) => typeof k === "string" && k.startsWith("/api/units"));
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tx.filter((t) => {
      if (statusF !== "all" && t.status.toLowerCase() !== statusF) return false;
      if (needle && !(t.id + " " + t.peminjam + " " + t.kegiatan).toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [tx, q, statusF]);

  return (
    <>
      <PageHeader
        title="History"
        subtitle="Seluruh transaksi peminjaman & pengembalian."
        action={
          <Button variant="outline" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari ID, peminjam, atau kegiatan…"
              className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
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
                {s === "all" ? "Semua" : s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
          </div>
        ) : error ? (
          <div className="m-4 flex items-start gap-2 rounded-xl bg-danger-soft p-4 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error.message}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-400">
            <History className="h-6 w-6" />
            Belum ada transaksi cocok.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Tanggal</th>
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">Peminjam</th>
                  <th className="px-5 py-3 font-medium">Kegiatan</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((t) => {
                  const m = txStatusMeta(t.status);
                  const open = t.status.toLowerCase() !== "selesai";
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setDetailId(t.id)}
                      className="cursor-pointer hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3 text-slate-500">{fmtDate(t.tanggalPinjam)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{t.id}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {t.peminjam}
                        {t.divisi ? (
                          <span className="ml-1 text-xs font-normal text-slate-400">· {t.divisi}</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{t.kegiatan || "-"}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${m.cls}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                          {t.status || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && open ? (
                            <button
                              onClick={() => setEditId(t.id)}
                              title="Edit peminjaman"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          ) : null}
                          {isAdmin && open ? (
                            <button
                              onClick={() => setDeleteTx(t)}
                              title="Hapus peminjaman"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-card px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger-soft"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Hapus
                            </button>
                          ) : null}
                          <Link
                            href={`/surat-jalan/${encodeURIComponent(t.id)}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Surat Jalan
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detailId ? (
        <TransactionDetailDrawer
          id={detailId}
          onClose={() => setDetailId(null)}
          onEdit={
            canEdit
              ? (id) => {
                  setDetailId(null);
                  setEditId(id);
                }
              : undefined
          }
        />
      ) : null}

      {editId ? (
        <EditTransactionDrawer
          id={editId}
          onClose={() => setEditId(null)}
          onSaved={() => {
            setEditId(null);
            refreshAll();
          }}
        />
      ) : null}

      {deleteTx ? (
        <DeleteConfirm
          tx={deleteTx}
          onClose={() => setDeleteTx(null)}
          onDeleted={() => {
            setDeleteTx(null);
            refreshAll();
          }}
        />
      ) : null}
    </>
  );
}

// ---------------- Detail (read-only) ----------------
function TransactionDetailDrawer({
  id,
  onClose,
  onEdit,
}: {
  id: string;
  onClose: () => void;
  onEdit?: (id: string) => void;
}) {
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchTransaction(id)
      .then((t) => alive && setTx(t))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const items = tx?.items || [];
  const dipinjam = items.filter((i) => i.statusItem === "dipinjam").length;
  const kembali = items.filter((i) => i.statusItem !== "dipinjam").length;
  const rusakHilang = items.filter((i) => {
    const k = (i.kondisiKembali || "").toLowerCase();
    return k.includes("rusak") || k.includes("hilang");
  }).length;
  const open = tx ? tx.status.toLowerCase() !== "selesai" : false;

  return (
    <>
      <button
        className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Tutup"
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-card shadow-pop">
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-400">{id}</p>
            <h2 className="font-display text-lg font-bold text-slate-900">Detail Peminjaman</h2>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && open ? (
              <button
                onClick={() => onEdit(id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
          </div>
        ) : err ? (
          <div className="m-5 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {err}
          </div>
        ) : tx ? (
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {/* header meta */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Meta label="Peminjam" value={tx.peminjam} />
              <Meta label="Divisi" value={tx.divisi || "-"} />
              <Meta label="Kegiatan" value={tx.kegiatan || "-"} />
              <Meta label="Tanggal pinjam" value={fmtDate(tx.tanggalPinjam)} />
              <Meta label="Rencana kembali" value={tx.kembaliRencana ? fmtDate(tx.kembaliRencana) : "-"} />
              <Meta label="Status" value={tx.status} />
              {tx.createdBy ? <Meta label="Dibuat oleh" value={tx.createdBy} /> : null}
              {tx.catatan ? <Meta label="Catatan" value={tx.catatan} /> : null}
            </div>

            {/* summary */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-brand-soft px-2.5 py-1 font-medium text-brand">
                {dipinjam} masih dipinjam
              </span>
              <span className="rounded-full bg-ok-soft px-2.5 py-1 font-medium text-ok">
                {kembali} dikembalikan
              </span>
              {rusakHilang > 0 ? (
                <span className="rounded-full bg-danger-soft px-2.5 py-1 font-medium text-danger">
                  {rusakHilang} rusak/hilang
                </span>
              ) : null}
            </div>

            {/* items */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Barang ({items.length})
              </p>
              <ul className="space-y-1.5">
                {items.map((i) => {
                  const returned = i.statusItem !== "dipinjam";
                  const kond = (i.kondisiKembali || "").toLowerCase();
                  const bad = kond.includes("rusak") || kond.includes("hilang");
                  return (
                    <li
                      key={i.unitId}
                      className="flex items-center gap-3 rounded-xl border border-line p-2.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {i.item}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {i.unitId}
                          {i.lokasi ? <span className="text-ok"> · {i.lokasi}</span> : null}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        {returned ? (
                          <>
                            <span
                              className={`block text-xs font-medium ${bad ? "text-danger" : "text-ok"}`}
                            >
                              {i.kondisiKembali || "Kembali"}
                            </span>
                            {i.returnedAt ? (
                              <span className="text-[11px] text-slate-400">
                                {fmtDate(i.returnedAt)}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                            Dipinjam
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <Link
              href={`/surat-jalan/${encodeURIComponent(id)}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" /> Cetak Surat Jalan
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-slate-700">{value}</p>
    </div>
  );
}

// ---------------- Edit drawer ----------------
function EditTransactionDrawer({
  id,
  onClose,
  onSaved,
}: {
  id: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [tx, setTx] = useState<Transaction | null>(null);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [avail, setAvail] = useState<Unit[]>([]);

  const [peminjam, setPeminjam] = useState("");
  const [divisi, setDivisi] = useState("");
  const [kegiatan, setKegiatan] = useState("");
  const [kembaliRencana, setKembaliRencana] = useState("");
  const [catatan, setCatatan] = useState("");

  const [removeSet, setRemoveSet] = useState<Set<string>>(new Set());
  const [addSet, setAddSet] = useState<Set<string>>(new Set());
  const [pickQ, setPickQ] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([fetchTransaction(id), fetchUnits({ status: "available" }), fetchConfig()])
      .then(([t, units, cfg]) => {
        if (!alive) return;
        setTx(t);
        setPeminjam(t.peminjam);
        setDivisi(t.divisi);
        setKegiatan(t.kegiatan);
        setKembaliRencana(t.kembaliRencana);
        setCatatan(t.catatan);
        setAvail(units);
        setDivisions(cfg.divisions);
      })
      .catch((e) => alive && setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const dipinjam: TransactionItem[] = (tx?.items || []).filter((i) => i.statusItem === "dipinjam");
  const returned: TransactionItem[] = (tx?.items || []).filter((i) => i.statusItem !== "dipinjam");

  const keepCount = dipinjam.filter((i) => !removeSet.has(i.unitId)).length;
  const totalAfter = keepCount + addSet.size + returned.length;

  const availFiltered = useMemo(() => {
    const n = pickQ.trim().toLowerCase();
    return avail
      .filter((u) => !addSet.has(u.unitId))
      .filter((u) => !n || (u.item + " " + u.unitId).toLowerCase().includes(n))
      .slice(0, 40);
  }, [avail, addSet, pickQ]);

  const addedUnits = avail.filter((u) => addSet.has(u.unitId));

  function toggleRemove(unitId: string) {
    setRemoveSet((s) => {
      const n = new Set(s);
      if (n.has(unitId)) n.delete(unitId);
      else n.add(unitId);
      return n;
    });
  }
  function addUnit(unitId: string) {
    setAddSet((s) => new Set(s).add(unitId));
  }
  function unAdd(unitId: string) {
    setAddSet((s) => {
      const n = new Set(s);
      n.delete(unitId);
      return n;
    });
  }

  async function save() {
    if (totalAfter === 0) {
      setErr("Transaksi tidak boleh kosong. Untuk membatalkan seluruh peminjaman, gunakan Hapus.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await updateTransaction(id, {
        peminjam: peminjam.trim(),
        divisi,
        kegiatan: kegiatan.trim(),
        kembaliRencana,
        catatan: catatan.trim(),
        addUnitIds: [...addSet],
        removeUnitIds: [...removeSet],
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-label="Tutup" />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-card shadow-pop">
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-xs text-slate-400">{id}</p>
            <h2 className="font-display text-lg font-bold text-slate-900">Edit Peminjaman</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {/* header fields */}
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Nama Peminjam</span>
                <input value={peminjam} onChange={(e) => setPeminjam(e.target.value)} className={inp} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Divisi</span>
                <select value={divisi} onChange={(e) => setDivisi(e.target.value)} className={inp}>
                  <option value="">—</option>
                  {divisions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  {divisi && !divisions.includes(divisi) ? <option value={divisi}>{divisi}</option> : null}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Kembali (Rencana)</span>
                <input type="date" value={kembaliRencana} onChange={(e) => setKembaliRencana(e.target.value)} className={inp} />
              </label>
              <label className="col-span-2 block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Nama Kegiatan</span>
                <input value={kegiatan} onChange={(e) => setKegiatan(e.target.value)} className={inp} />
              </label>
              <label className="col-span-2 block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Catatan</span>
                <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} className={inp} />
              </label>
            </div>

            {/* borrowed items with remove toggles */}
            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Barang dipinjam ({keepCount}/{dipinjam.length})
              </p>
              {dipinjam.length === 0 ? (
                <p className="rounded-xl bg-surface px-3 py-2 text-xs text-slate-400">Tidak ada unit aktif.</p>
              ) : (
                <ul className="space-y-1.5">
                  {dipinjam.map((i) => {
                    const removed = removeSet.has(i.unitId);
                    return (
                      <li
                        key={i.unitId}
                        className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                          removed ? "border-danger/30 bg-danger-soft/40" : "border-line"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm font-medium ${removed ? "text-slate-400 line-through" : "text-slate-800"}`}>
                            {i.item}
                          </span>
                          <span className="font-mono text-xs text-slate-400">{i.unitId}</span>
                        </span>
                        <button
                          onClick={() => toggleRemove(i.unitId)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                            removed
                              ? "border border-line bg-card text-slate-600 hover:bg-slate-50"
                              : "border border-danger/30 text-danger hover:bg-danger-soft"
                          }`}
                        >
                          {removed ? "Batal" : "Keluarkan"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {returned.length > 0 ? (
                <p className="mt-2 text-[11px] text-slate-400">
                  {returned.length} unit sudah dikembalikan (tidak bisa diubah di sini).
                </p>
              ) : null}
            </section>

            {/* add units */}
            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Tambah unit</p>
              {addedUnits.length > 0 ? (
                <ul className="mb-2 space-y-1.5">
                  {addedUnits.map((u) => (
                    <li key={u.unitId} className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft/40 p-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{u.item}</span>
                        <span className="font-mono text-xs text-slate-400">{u.unitId}</span>
                      </span>
                      <button onClick={() => unAdd(u.unitId)} className="rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                        Batal
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={pickQ}
                  onChange={(e) => setPickQ(e.target.value)}
                  placeholder="Cari unit available…"
                  className={`${inp} pl-9`}
                />
              </div>
              <ul className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-line p-1">
                {availFiltered.length === 0 ? (
                  <li className="px-2 py-6 text-center text-xs text-slate-400">Tidak ada unit available cocok.</li>
                ) : (
                  availFiltered.map((u) => (
                    <li key={u.unitId}>
                      <button
                        onClick={() => addUnit(u.unitId)}
                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50"
                      >
                        <Plus className="h-4 w-4 shrink-0 text-brand" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-slate-800">{u.item}</span>
                          <span className="font-mono text-xs text-slate-400">
                            {u.unitId}
                            {u.lokasi ? ` · ${u.lokasi}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>

            {err ? (
              <div className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {err}
              </div>
            ) : null}
          </div>
        )}

        <div className="flex gap-2 border-t border-line p-4">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button className="flex-1" onClick={save} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Simpan Perubahan
          </Button>
        </div>
      </aside>
    </>
  );
}

// ---------------- Delete confirm ----------------
function DeleteConfirm({
  tx,
  onClose,
  onDeleted,
}: {
  tx: Transaction;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    try {
      await deleteTransaction(tx.id);
      onDeleted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <>
      <button className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-label="Tutup" />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-4">
        <Card className="p-5">
          <CardHeader title="Hapus Peminjaman?" />
          <div className="px-0">
            <p className="text-sm text-slate-600">
              Transaksi <span className="font-mono text-slate-800">{tx.id}</span> ({tx.peminjam}) akan
              dihapus permanen. Semua unit yang masih dipinjam akan dikembalikan ke stok
              (available).
            </p>
            {err ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {err}
              </div>
            ) : null}
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
                Batal
              </Button>
              <button
                onClick={run}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger px-3.5 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Ya, hapus
              </button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

const inp =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryInner />
    </Suspense>
  );
}
