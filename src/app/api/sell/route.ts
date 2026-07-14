import { NextResponse } from "next/server";
import { sellAsset } from "@/lib/mac-api";
import { guard } from "@/lib/auth-helpers";
import type { SellPayload } from "@/types/mac";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard("admin");
  if (g instanceof Response) return g;
  try {
    const b = (await req.json()) as Partial<SellPayload>;
    if (!b.unitId || !b.buyer) {
      return NextResponse.json({ ok: false, error: "unitId & buyer wajib." }, { status: 400 });
    }
    const data = await sellAsset({
      unitId: b.unitId,
      buyer: b.buyer,
      salePrice: Number(b.salePrice) || 0,
      saleDate: b.saleDate,
      proofBase64: b.proofBase64,
      proofMimeType: b.proofMimeType,
      recordedBy: g.email,
    });
    return NextResponse.json({ ok: true, saleId: data.saleId, proof: data.proof ?? "" });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
