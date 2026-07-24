// SERVER-ONLY. Talks to the Apps Script Web App. Never import from client components.
// The token stays here so it is never shipped to the browser.

import {
  mapUnit,
  mapTransaction,
  type Unit,
  type Transaction,
  type BorrowPayload,
  type ReturnPayload,
  type UpdateUnitPayload,
  type AddAssetPayload,
  type UploadPhotoPayload,
} from "@/types/mac";

const BASE_URL = process.env.MAC_APPS_SCRIPT_URL || "";
const TOKEN = process.env.MAC_API_TOKEN || "";

function assertConfigured() {
  if (!BASE_URL) {
    throw new Error(
      "MAC_APPS_SCRIPT_URL belum di-set. Isi di .env.local (lihat .env.local.example)."
    );
  }
}

interface GasResponse {
  ok: boolean;
  error?: string;
  [k: string]: unknown;
}

async function gasGet(params: Record<string, string>): Promise<GasResponse> {
  assertConfigured();
  const qs = new URLSearchParams({ ...params, token: TOKEN }).toString();
  const res = await fetch(`${BASE_URL}?${qs}`, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Apps Script GET ${res.status}`);
  const data = (await res.json()) as GasResponse;
  if (!data.ok) throw new Error(data.error || "Apps Script error");
  return data;
}

async function gasPost(body: Record<string, unknown>): Promise<GasResponse> {
  assertConfigured();
  const res = await fetch(BASE_URL, {
    method: "POST",
    redirect: "follow",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, token: TOKEN }),
  });
  if (!res.ok) throw new Error(`Apps Script POST ${res.status}`);
  const data = (await res.json()) as GasResponse;
  if (!data.ok) throw new Error(data.error || "Apps Script error");
  return data;
}

// ---- public API ----

export async function ping(): Promise<GasResponse> {
  return gasGet({ action: "ping" });
}

export async function getUnits(filter?: {
  q?: string;
  status?: string;
  group?: string;
}): Promise<Unit[]> {
  const params: Record<string, string> = { action: "units" };
  if (filter?.q) params.q = filter.q;
  if (filter?.status) params.status = filter.status;
  if (filter?.group) params.group = filter.group;
  const data = await gasGet(params);
  const rows = (data.units as Record<string, unknown>[]) || [];
  return rows.map(mapUnit);
}

export async function getHistory(): Promise<Transaction[]> {
  const data = await gasGet({ action: "history" });
  const rows = (data.transactions as Record<string, unknown>[]) || [];
  return rows.map(mapTransaction);
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const data = await gasGet({ action: "transaction", id });
  if (!data.transaction) return null;
  return mapTransaction(data.transaction as Record<string, unknown>);
}

export async function borrow(payload: BorrowPayload): Promise<GasResponse> {
  return gasPost({ action: "borrow", ...payload });
}

export async function processReturn(payload: ReturnPayload): Promise<GasResponse> {
  return gasPost({ action: "return", ...payload });
}

export async function updateUnit(payload: UpdateUnitPayload): Promise<GasResponse> {
  return gasPost({ action: "updateUnit", ...payload });
}

export async function addAsset(payload: AddAssetPayload): Promise<GasResponse> {
  return gasPost({ action: "addAsset", ...payload });
}

export async function uploadPhoto(payload: UploadPhotoPayload): Promise<GasResponse> {
  return gasPost({ action: "uploadPhoto", ...payload });
}

export async function getPhoto(
  id: string
): Promise<{ mimeType: string; base64: string }> {
  const data = await gasGet({ action: "photo", id });
  return { mimeType: String(data.mimeType || "image/jpeg"), base64: String(data.base64 || "") };
}

export async function getUsage(from?: string, to?: string): Promise<GasResponse> {
  const params: Record<string, string> = { action: "usage" };
  if (from) params.from = from;
  if (to) params.to = to;
  return gasGet(params);
}

export async function sellAsset(payload: {
  unitId: string; buyer: string; salePrice: number; saleDate?: string;
  proofBase64?: string; proofMimeType?: string; recordedBy?: string;
}): Promise<GasResponse> {
  return gasPost({ action: "sellAsset", ...payload });
}

export async function getSales(from?: string, to?: string): Promise<GasResponse> {
  const params: Record<string, string> = { action: "sales" };
  if (from) params.from = from;
  if (to) params.to = to;
  return gasGet(params);
}

export async function getSale(id: string): Promise<GasResponse> {
  return gasGet({ action: "sale", id });
}

export async function getConfig(): Promise<GasResponse> {
  return gasGet({ action: "config" });
}
export async function getUsers(): Promise<GasResponse> {
  return gasGet({ action: "users" });
}
export async function setDivisions(divisions: string[]): Promise<GasResponse> {
  return gasPost({ action: "setDivisions", divisions });
}
export async function setSettings(payload: { companyName?: string; saleAgeMonths?: number }): Promise<GasResponse> {
  return gasPost({ action: "setSettings", ...payload });
}
export async function addUser(payload: { name: string; email: string; password: string; role: string }): Promise<GasResponse> {
  return gasPost({ action: "addUser", ...payload });
}
export async function updateUser(payload: { email: string; name?: string; role?: string; active?: boolean; password?: string }): Promise<GasResponse> {
  return gasPost({ action: "updateUser", ...payload });
}
export async function deleteUser(email: string): Promise<GasResponse> {
  return gasPost({ action: "deleteUser", email });
}

export async function getRole(email: string): Promise<GasResponse> {
  return gasGet({ action: "role", email });
}

export async function login(email: string, password: string): Promise<GasResponse> {
  return gasPost({ action: "login", email, password });
}

export async function updateTransaction(payload: {
  transactionId: string;
  peminjam?: string;
  divisi?: string;
  kegiatan?: string;
  kembaliRencana?: string;
  catatan?: string;
  addUnitIds?: string[];
  removeUnitIds?: string[];
}): Promise<GasResponse> {
  return gasPost({ action: "updateTransaction", ...payload });
}

export async function deleteTransaction(transactionId: string): Promise<GasResponse> {
  return gasPost({ action: "deleteTransaction", transactionId });
}

export async function getUnitLast(unitId: string): Promise<GasResponse> {
  return gasGet({ action: "unitLast", unitId });
}

export async function saveOpname(payload: {
  operator?: string;
  catatan?: string;
  items: { unitId: string; hasil: string; lokasiBaru?: string; kondisiBaru?: string }[];
}): Promise<GasResponse> {
  return gasPost({ action: "saveOpname", ...payload });
}
export async function listOpname(): Promise<GasResponse> {
  return gasGet({ action: "opnameList" });
}
export async function getOpname(id: string): Promise<GasResponse> {
  return gasGet({ action: "opname", id });
}

export async function archiveUnit(unitId: string, by: string, reason?: string): Promise<GasResponse> {
  return gasPost({ action: "archiveUnit", unitId, by, reason: reason || "" });
}
export async function unarchiveUnit(unitId: string): Promise<GasResponse> {
  return gasPost({ action: "unarchiveUnit", unitId });
}
export async function listArchived(): Promise<GasResponse> {
  return gasGet({ action: "archivedUnits" });
}
