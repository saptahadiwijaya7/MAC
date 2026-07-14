import { NextRequest, NextResponse } from "next/server";
import { getUnits } from "@/lib/mac-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const units = await getUnits({
      q: p.get("q") || undefined,
      status: p.get("status") || undefined,
      group: p.get("group") || undefined,
    });
    return NextResponse.json({ ok: true, units });
  } catch (err) {
    return NextResponse.json({ ok: false, error: msg(err) }, { status: 500 });
  }
}

function msg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
