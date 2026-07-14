"use client";

import useSWR from "swr";
import { mapSale } from "@/types/mac";
import type { Unit, Transaction, AppConfig, UsageRow, SaleRecord } from "@/types/mac";

function qstr(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function useUnits(filter?: { q?: string; status?: string; group?: string; sale?: string }) {
  const key = `/api/units${qstr({ q: filter?.q, status: filter?.status, group: filter?.group, sale: filter?.sale })}`;
  const { data, error, isLoading, mutate } = useSWR<{ units: Unit[] }>(key);
  return { units: data?.units ?? [], error: error as Error | undefined, isLoading, mutate };
}

export function useHistory() {
  const { data, error, isLoading, mutate } = useSWR<{ transactions: Transaction[] }>("/api/history");
  return { transactions: data?.transactions ?? [], error: error as Error | undefined, isLoading, mutate };
}

export function useConfig() {
  const { data, error, isLoading, mutate } = useSWR<{ config: AppConfig }>("/api/config");
  return { config: data?.config, error: error as Error | undefined, isLoading, mutate };
}

export function useUsage(from?: string, to?: string) {
  const key = `/api/usage${qstr({ from, to })}`;
  const { data, error, isLoading, mutate } = useSWR<{ usage: UsageRow[] }>(key);
  return { usage: data?.usage ?? [], error: error as Error | undefined, isLoading, mutate };
}

export function useSales(from?: string, to?: string) {
  const key = `/api/sales${qstr({ from, to })}`;
  const { data, error, isLoading, mutate } = useSWR<{ sales: Record<string, unknown>[] }>(key);
  const sales = (data?.sales ?? []).map(mapSale) as SaleRecord[];
  return { sales, error: error as Error | undefined, isLoading, mutate };
}
