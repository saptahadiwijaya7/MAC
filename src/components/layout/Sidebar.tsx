"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Boxes, X } from "lucide-react";
import { NAV_ITEMS } from "@/constants/nav";
import { roleAtLeast } from "@/lib/roles";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  const base = href.split("?")[0];
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(base + "/");
}

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { data } = useSession();
  const role = data?.user?.role;
  const visibleItems = NAV_ITEMS.filter((i) => !i.minRole || roleAtLeast(role, i.minRole));

  // group items, preserving order of first appearance
  const groups: { name: string | null; items: typeof NAV_ITEMS }[] = [];
  for (const item of visibleItems) {
    const key = item.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.name === key) last.items.push(item);
    else groups.push({ name: key, items: [item] });
  }

  return (
    <>
      {/* mobile scrim */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-ink text-slate-300 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/" className="flex items-center gap-3" onClick={onClose}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-pop">
              <Boxes className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold tracking-tight text-white">
                MAC
              </span>
              <span className="block text-[11px] text-slate-400">
                Marketing Asset Center
              </span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-soft hover:text-white lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.name ? (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {g.name}
                </p>
              ) : null}
              <ul className="space-y-1">
                {g.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-brand/15 text-white"
                            : "text-slate-400 hover:bg-ink-soft hover:text-white"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            active ? "text-brand" : "text-slate-500 group-hover:text-slate-300"
                          )}
                        />
                        <span className="font-medium">{item.label}</span>
                        {active ? (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-ink-line px-5 py-4 text-[11px] text-slate-500">
          v0.1.0-alpha · Manage. Track. Optimize.
        </div>
      </aside>
    </>
  );
}
