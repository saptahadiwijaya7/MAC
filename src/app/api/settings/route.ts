import { NextResponse } from "next/server";
import { setSettings } from "@/lib/mac-api";
import { guard } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard("admin");
  if (g instanceof Response) return g;
  void g;
  try {
    const body = (await req.json()) as { companyName?: string; saleAgeMonths?: number };
    await setSettings(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
