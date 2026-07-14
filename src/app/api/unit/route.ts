import { NextResponse } from "next/server";
import { updateUnit } from "@/lib/mac-api";
import type { UpdateUnitPayload } from "@/types/mac";
import { guard } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard("admin");
  if (g instanceof Response) return g;
  void g;
  try {
    const body = (await req.json()) as Partial<UpdateUnitPayload>;
    if (!body.unitId) {
      return NextResponse.json(
        { ok: false, error: "unitId wajib." },
        { status: 400 }
      );
    }
    const data = await updateUnit({
      unitId: body.unitId,
      status: body.status,
      sale: body.sale,
      kondisi: body.kondisi,
      lokasi: body.lokasi,
    });
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
