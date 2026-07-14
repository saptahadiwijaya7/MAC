"use client";

// Thin client wrappers around the Next.js /api routes.
// Client code NEVER calls Apps Script directly — always via these.

import type {
  Unit,
  Transaction,
  BorrowPayload,
  ReturnPayload,
  UpdateUnitPayload,
  AddAssetPayload,
  UsageRow,
  SellPayload,
  SaleRecord,
  AppConfig,
  UserRow,
  UploadPhotoPayload,
} from "@/types/mac";
import { mapSale } from "@/types/mac";

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data && data.ok === false)) {
    throw new Error((data && data.error) || `Request gagal (${res.status})`);
  }
  return data as T;
}

export async function fetchUnits(filter?: {
  q?: string;
  status?: string;
  group?: string;
}): Promise<Unit[]> {
  const qs = new URLSearchParams();
  if (filter?.q) qs.set("q", filter.q);
  if (filter?.status) qs.set("status", filter.status);
  if (filter?.group) qs.set("group", filter.group);
  const res = await fetch(`/api/units?${qs.toString()}`, { cache: "no-store" });
  const data = await jsonOrThrow<{ units: Unit[] }>(res);
  return data.units;
}

export async function fetchTransaction(id: string): Promise<Transaction> {
  const res = await fetch(`/api/transaction/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  const data = await jsonOrThrow<{ transaction: Transaction }>(res);
  return data.transaction;
}

export async function submitBorrow(
  payload: BorrowPayload
): Promise<{ id: string; count: number }> {
  const res = await fetch("/api/borrow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow<{ id: string; count: number }>(res);
}

export async function submitReturn(
  payload: ReturnPayload
): Promise<{ id: string; returned: number; remaining: number }> {
  const res = await fetch("/api/return", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow<{ id: string; returned: number; remaining: number }>(res);
}

export async function updateUnit(
  payload: UpdateUnitPayload
): Promise<{ unitId: string; changed: Record<string, string> }> {
  const res = await fetch("/api/unit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow<{ unitId: string; changed: Record<string, string> }>(res);
}

export async function addAsset(
  payload: AddAssetPayload
): Promise<{ no: string; units: number }> {
  const res = await fetch("/api/asset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow<{ no: string; units: number }>(res);
}

export async function uploadPhoto(
  payload: UploadPhotoPayload
): Promise<{ unitId: string; photo: string }> {
  const res = await fetch("/api/photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow<{ unitId: string; photo: string }>(res);
}

export async function fetchUsage(from?: string, to?: string): Promise<UsageRow[]> {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const res = await fetch(`/api/usage?${qs.toString()}`, { cache: "no-store" });
  const data = await jsonOrThrow<{ usage: UsageRow[] }>(res);
  return data.usage || [];
}

export async function sellAsset(
  payload: SellPayload
): Promise<{ saleId: string; proof: string }> {
  const res = await fetch("/api/sell", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow<{ saleId: string; proof: string }>(res);
}

export async function fetchSales(from?: string, to?: string): Promise<SaleRecord[]> {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const res = await fetch(`/api/sales?${qs.toString()}`, { cache: "no-store" });
  const data = await jsonOrThrow<{ sales: Record<string, unknown>[] }>(res);
  return (data.sales || []).map(mapSale);
}

export async function fetchSale(id: string): Promise<SaleRecord | null> {
  const res = await fetch(`/api/sale/${encodeURIComponent(id)}`, { cache: "no-store" });
  const data = await jsonOrThrow<{ sale: Record<string, unknown> | null }>(res);
  return data.sale ? mapSale(data.sale) : null;
}

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch("/api/config", { cache: "no-store" });
  const data = await jsonOrThrow<{ config: AppConfig | null }>(res);
  return (
    data.config ?? { divisions: [], companyName: "Accurate Marketing", saleAgeMonths: 48, overdueDays: 7 }
  );
}

export async function fetchUsers(): Promise<UserRow[]> {
  const res = await fetch("/api/users", { cache: "no-store" });
  const data = await jsonOrThrow<{ users: UserRow[] }>(res);
  return data.users || [];
}

export async function saveDivisions(divisions: string[]): Promise<string[]> {
  const res = await fetch("/api/divisions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ divisions }),
  });
  const data = await jsonOrThrow<{ divisions: string[] }>(res);
  return data.divisions || [];
}

export async function saveSettings(payload: { companyName?: string; saleAgeMonths?: number; overdueDays?: number }): Promise<void> {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await jsonOrThrow(res);
}

export async function createUser(payload: { name: string; email: string; password: string; role: string }): Promise<void> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "add", ...payload }),
  });
  await jsonOrThrow(res);
}

export async function editUser(payload: { email: string; name?: string; role?: string; active?: boolean; password?: string }): Promise<void> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "update", ...payload }),
  });
  await jsonOrThrow(res);
}

export async function removeUser(email: string): Promise<void> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "delete", email }),
  });
  await jsonOrThrow(res);
}

export async function updateTransaction(
  id: string,
  payload: {
    peminjam?: string;
    divisi?: string;
    kegiatan?: string;
    kembaliRencana?: string;
    catatan?: string;
    addUnitIds?: string[];
    removeUnitIds?: string[];
  }
): Promise<void> {
  const res = await fetch(`/api/transaction/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await jsonOrThrow<Record<string, unknown>>(res);
}

export async function deleteTransaction(id: string): Promise<void> {
  const res = await fetch(`/api/transaction/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await jsonOrThrow<Record<string, unknown>>(res);
}
