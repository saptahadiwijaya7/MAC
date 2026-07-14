"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, Plus, LogOut, Bell, Clock } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { roleAtLeast, ROLE_LABEL, type Role } from "@/lib/roles";
import { overdueInfo, overdueText, type OverdueLevel } from "@/lib/overdue";
import { fmtDate } from "@/lib/utils";
import type { Transaction } from "@/types/mac";

interface Alert {
  id: string;
  peminjam: string;
  tanggalPinjam: string;
  level: OverdueLevel;
  daysLate: number;
  text: string;
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const { data } = useSession();
  const router = useRouter();
  const email = data?.user?.email || "";
  const role = (data?.user?.role as Role) || "viewer";
  const initials = email ? email.slice(0, 2).toUpperCase() : "··";
  const canBorrow = roleAtLeast(role, "user");

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [hRes, cRes] = await Promise.all([
        fetch("/api/history", { cache: "no-store" }),
        fetch("/api/config", { cache: "no-store" }),
      ]);
      const h = await hRes.json();
      const c = await cRes.json();
      if (!h.ok) return;
      const overdueDays = Number(c?.config?.overdueDays) || 7;
      const list = (h.transactions as Transaction[])
        .map((t) => ({ t, info: overdueInfo(t, overdueDays) }))
        .filter((x) => x.info.level !== "ok")
        .sort((a, b) => b.info.daysLate - a.info.daysLate)
        .map(({ t, info }) => ({
          id: t.id,
          peminjam: t.peminjam,
          tanggalPinjam: t.tanggalPinjam,
          level: info.level,
          daysLate: info.daysLate,
          text: overdueText(info),
        }));
      setAlerts(list);
    } catch {
      /* silent */
    }
  }, []);

  // Initial load + periodic auto-refresh (every 60s) + refresh on tab focus.
  useEffect(() => {
    if (!canBorrow) return;
    load();
    const iv = setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [canBorrow, load]);

  // Close the dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const lateCount = alerts.filter((a) => a.level === "late").length;

  function go(id: string) {
    setOpen(false);
    router.push(`/transaction/return?id=${encodeURIComponent(id)}`);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          onClick={onMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden max-w-md flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari asset, ID peminjaman, atau nama…"
            className="w-full rounded-xl border border-line bg-card py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {canBorrow ? (
            <Link
              href="/transaction/borrow"
              className="hidden items-center justify-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-hover sm:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Peminjaman
            </Link>
          ) : null}

          {canBorrow ? (
            <div className="relative" ref={boxRef}>
              <button
                onClick={() => {
                  const next = !open;
                  setOpen(next);
                  if (next) load();
                }}
                className="relative rounded-xl border border-line bg-card p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Notifikasi keterlambatan"
              >
                <Bell className="h-[18px] w-[18px]" />
                {lateCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ring-2 ring-surface">
                    {lateCount > 9 ? "9+" : lateCount}
                  </span>
                ) : alerts.length > 0 ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warn ring-2 ring-card" />
                ) : null}
              </button>

              {open ? (
                <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-card shadow-pop">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                      <span className="text-sm font-semibold text-slate-800">Belum dikembalikan</span>
                      {alerts.length > 0 ? (
                        <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
                          {lateCount} terlambat
                        </span>
                      ) : null}
                    </div>
                    {alerts.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-400">
                        Tidak ada yang terlambat.
                      </div>
                    ) : (
                      <ul className="max-h-96 divide-y divide-line overflow-y-auto">
                        {alerts.slice(0, 12).map((a) => (
                          <li key={a.id}>
                            <button
                              onClick={() => go(a.id)}
                              className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                            >
                              <span
                                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                                  a.level === "late"
                                    ? "bg-danger-soft text-danger"
                                    : "bg-warn-soft text-warn"
                                }`}
                              >
                                <Clock className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-x-2">
                                  <span className="font-mono text-xs font-semibold text-brand">{a.id}</span>
                                  <span className="truncate text-sm text-slate-700">{a.peminjam}</span>
                                </span>
                                <span
                                  className={`text-xs ${
                                    a.level === "late" ? "text-danger" : "text-amber-600"
                                  }`}
                                >
                                  {a.text} · pinjam {fmtDate(a.tanggalPinjam)}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-xl border border-line bg-card py-1 pl-1 pr-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block max-w-[160px] truncate text-sm font-medium text-slate-700">
                {email || "Belum login"}
              </span>
              <span className="block text-[11px] text-slate-400">{ROLE_LABEL[role]}</span>
            </span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Keluar"
            className="rounded-xl border border-line bg-card p-2 text-slate-500 hover:bg-slate-50 hover:text-danger"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
