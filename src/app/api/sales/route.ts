import { NextResponse } from "next/server";
import { getSales } from "@/lib/mac-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const data = await getSales(searchParams.get("from") || undefined, searchParams.get("to") || undefined);
    return NextResponse.json({ ok: true, sales: data.sales ?? [] });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
