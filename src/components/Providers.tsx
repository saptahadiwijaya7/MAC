"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data?.error || `Request gagal (${res.status})`);
  }
  return data;
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          fetcher,
          revalidateOnFocus: true,
          dedupingInterval: 5000,
          keepPreviousData: true,
        }}
      >
        {children}
      </SWRConfig>
    </SessionProvider>
  );
}
