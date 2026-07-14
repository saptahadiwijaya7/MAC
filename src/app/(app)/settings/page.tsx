"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertTriangle,
  Plus,
  X,
  Trash2,
  ShieldCheck,
  Check,
  KeyRound,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSession } from "next-auth/react";
import { roleAtLeast } from "@/lib/roles";
import {
  fetchConfig,
  fetchUsers,
  saveDivisions,
  saveSettings,
  createUser,
  editUser,
  removeUser,
} from "@/lib/client-api";
import type { AppConfig, UserRow } from "@/types/mac";

type Tab = "divisi" | "users" | "umum";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("divisi");
  const { data: session } = useSession();
  const isAdmin = roleAtLeast(session?.user?.role, "admin");

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Settings" subtitle="Pengaturan aplikasi." />
        <Card className="flex flex-col items-center gap-2 py-16 text-center text-sm text-slate-500">
          <ShieldCheck className="h-6 w-6 text-slate-400" />
          <p className="font-medium text-slate-700">Akses khusus admin</p>
          <p className="max-w-xs text-slate-400">
            Hanya admin yang dapat membuka pengaturan. Hubungi admin bila kamu perlu mengubah
            divisi, pengguna, atau preferensi.
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Kelola divisi, pengguna, dan preferensi aplikasi." />

      <div className="mb-5 flex gap-1.5">
        {(
          [
            ["divisi", "Divisi"],
            ["users", "Pengguna"],
            ["umum", "Umum"],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={
              tab === k
                ? "rounded-lg bg-ink px-3.5 py-1.5 text-sm font-medium text-white"
                : "rounded-lg border border-line bg-card px-3.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "divisi" ? <DivisiSection /> : null}
      {tab === "users" ? <UsersSection /> : null}
      {tab === "umum" ? <UmumSection /> : null}
    </>
  );
}

// ---------- Divisi ----------
function DivisiSection() {
  const [list, setList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchConfig()
      .then((c) => setList(c.divisions))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  function add() {
    const v = input.trim();
    if (!v) return;
    if (list.some((d) => d.toLowerCase() === v.toLowerCase())) return setInput("");
    setList([...list, v]);
    setInput("");
    setSaved(false);
  }
  function remove(i: number) {
    setList(list.filter((_, idx) => idx !== i));
    setSaved(false);
  }
  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await saveDivisions(list);
      setList(res);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <Card className="max-w-2xl">
      <CardHeader
        title="Daftar Divisi"
        action={<span className="text-xs text-slate-400">dipakai di form Peminjaman</span>}
      />
      <div className="px-5 pb-5">
        {error ? <ErrBox msg={error} /> : null}
        <div className="mb-4 flex flex-wrap gap-2">
          {list.map((d, i) => (
            <span
              key={d}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-slate-700"
            >
              {d}
              <button onClick={() => remove(i)} className="text-slate-400 hover:text-danger">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {list.length === 0 ? <p className="text-sm text-slate-400">Belum ada divisi.</p> : null}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Tambah divisi baru…"
            className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
          <Button variant="outline" onClick={add}>
            <Plus className="h-4 w-4" /> Tambah
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Simpan Divisi
          </Button>
          {saved ? (
            <span className="inline-flex items-center gap-1 text-sm text-ok">
              <Check className="h-4 w-4" /> Tersimpan
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

// ---------- Users ----------
function UsersSection() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  function load() {
    setLoading(true);
    setError("");
    fetchUsers()
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);

  async function toggleActive(u: UserRow) {
    try {
      await editUser({ email: u.email, active: !u.active });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  async function changeRole(u: UserRow, role: string) {
    try {
      await editUser({ email: u.email, role });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  async function del(u: UserRow) {
    if (!confirm(`Hapus user ${u.email}?`)) return;
    try {
      await removeUser(u.email);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-info-soft/60 p-3 text-sm text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <span>
          <b>Admin</b> dapat mengelola asset, menjual, mengatur user & divisi. <b>User</b> hanya
          meminjam, mengembalikan, dan melihat data. Pembedaan ini aktif penuh setelah halaman login
          dipasang (langkah berikutnya).
        </span>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Pengguna"
          action={
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Tambah User
            </Button>
          }
        />
        {error ? <div className="px-5"><ErrBox msg={error} /></div> : null}
        {loading ? (
          <Loading />
        ) : users.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-slate-400">
            Belum ada user. Tambah admin pertama untuk mulai.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Nama</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Aktif</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => (
                  <tr key={u.email} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-medium text-slate-900">{u.name}</td>
                    <td className="px-5 py-3 text-slate-500">{u.email}</td>
                    <td className="px-5 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        className="rounded-lg border border-line bg-card px-2 py-1 text-xs font-medium text-slate-700 focus:border-brand focus:outline-none"
                      >
                        <option value="admin">admin</option>
                        <option value="user">user</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleActive(u)}
                        className={
                          u.active
                            ? "inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-xs font-medium text-ok"
                            : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
                        }
                      >
                        {u.active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditing(u)}
                          title="Reset password"
                          className="rounded-lg border border-line bg-card p-1.5 text-slate-500 hover:bg-slate-50"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => del(u)}
                          title="Hapus"
                          className="rounded-lg border border-line bg-card p-1.5 text-danger hover:bg-danger-soft"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showAdd ? (
        <UserModal
          mode="add"
          onClose={() => setShowAdd(false)}
          onDone={() => {
            setShowAdd(false);
            load();
          }}
        />
      ) : null}
      {editing ? (
        <UserModal
          mode="reset"
          user={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            load();
          }}
        />
      ) : null}
    </>
  );
}

function UserModal({
  mode,
  user,
  onClose,
  onDone,
}: {
  mode: "add" | "reset";
  user?: UserRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [role, setRole] = useState<string>(user?.role || "user");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    if (mode === "add" && (!name.trim() || !email.trim())) return setErr("Nama & email wajib.");
    if (!password.trim()) return setErr("Password wajib.");
    setBusy(true);
    try {
      if (mode === "add") {
        await createUser({ name: name.trim(), email: email.trim(), password, role });
      } else if (user) {
        await editUser({ email: user.email, password });
      }
      onDone();
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
        <div className="w-full max-w-md rounded-2xl bg-card shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-lg font-bold text-slate-900">
              {mode === "add" ? "Tambah User" : `Reset Password · ${user?.name}`}
            </h2>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3 px-5 py-5">
            {mode === "add" ? (
              <>
                <Labeled label="Nama">
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                </Labeled>
                <Labeled label="Email">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                </Labeled>
                <Labeled label="Role">
                  <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
                    <option value="admin">admin</option>
                    <option value="user">user</option>
                  </select>
                </Labeled>
              </>
            ) : null}
            <Labeled label={mode === "add" ? "Password" : "Password baru"}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            </Labeled>
            {err ? <ErrBox msg={err} /> : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose} disabled={busy}>
                Batal
              </Button>
              <Button onClick={submit} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "add" ? <Plus className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                {mode === "add" ? "Tambah" : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------- Umum ----------
function UmumSection() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [company, setCompany] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [overdueDays, setOverdueDays] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchConfig()
      .then((c) => {
        setCfg(c);
        setCompany(c.companyName);
        setAgeMonths(String(c.saleAgeMonths));
        setOverdueDays(String(c.overdueDays));
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    try {
      await saveSettings({
        companyName: company.trim(),
        saleAgeMonths: Number(ageMonths) || 0,
        overdueDays: Number(overdueDays) || 0,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  void cfg;

  return (
    <Card className="max-w-2xl">
      <CardHeader title="Preferensi Umum" />
      <div className="space-y-3 px-5 pb-5">
        {error ? <ErrBox msg={error} /> : null}
        <Labeled label="Nama Perusahaan (kop surat jalan)">
          <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} />
        </Labeled>
        <Labeled label="Umur auto-jual (bulan)">
          <input
            type="number"
            value={ageMonths}
            onChange={(e) => setAgeMonths(e.target.value)}
            className={inputCls}
          />
          <span className="mt-1 block text-[11px] text-slate-400">
            Unit yang berusia ≥ nilai ini otomatis ditandai &quot;siap jual (auto)&quot;. Default 48 bulan.
          </span>
        </Labeled>
        <Labeled label="Ambang terlambat (hari)">
          <input
            type="number"
            value={overdueDays}
            onChange={(e) => setOverdueDays(e.target.value)}
            className={inputCls}
          />
          <span className="mt-1 block text-[11px] text-slate-400">
            Dipakai bila peminjaman tidak punya tanggal kembali. Peminjaman yang belum kembali
            melewati (tanggal pinjam + nilai ini) dianggap terlambat. Default 7 hari.
          </span>
        </Labeled>
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Simpan
          </Button>
          {saved ? (
            <span className="inline-flex items-center gap-1 text-sm text-ok">
              <Check className="h-4 w-4" /> Tersimpan
            </span>
          ) : null}
        </div>
        <p className="mt-2 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-400">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Token API & URL Apps Script disimpan sebagai environment variable di server (.env.local),
          bukan di sini, demi keamanan.
        </p>
      </div>
    </Card>
  );
}

// ---------- shared ----------
const inputCls =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      {msg}
    </div>
  );
}
