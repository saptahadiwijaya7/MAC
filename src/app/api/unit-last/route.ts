import { NextResponse } from "next/server";
import { getUnitLast } from "@/lib/mac-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const unitId = new URL(req.url).searchParams.get("unitId") || "";
    if (!unitId) return NextResponse.json({ ok: false, error: "unitId wajib" }, { status: 400 });
    const data = await getUnitLast(unitId);
    const { ok: _ok, ...rest } = data;
    void _ok;
    return NextResponse.json({ ok: true, ...rest });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
