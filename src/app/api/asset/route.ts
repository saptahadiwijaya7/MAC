import { NextResponse } from "next/server";
import { addAsset } from "@/lib/mac-api";
import type { AddAssetPayload } from "@/types/mac";
import { guard } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard("admin");
  if (g instanceof Response) return g;
  void g;
  try {
    const body = (await req.json()) as Partial<AddAssetPayload>;
    if (!body.group || !body.item) {
      return NextResponse.json(
        { ok: false, error: "Group dan nama barang wajib." },
        { status: 400 }
      );
    }
    const data = await addAsset({
      group: body.group,
      item: body.item,
      qty: body.qty ?? 1,
      no: body.no,
      lokasi: body.lokasi,
      purchaseDate: body.purchaseDate,
      hargaBeli: body.hargaBeli,
      remarks: body.remarks,
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
