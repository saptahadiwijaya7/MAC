import { NextResponse } from "next/server";
import { borrow } from "@/lib/mac-api";
import { guard } from "@/lib/auth-helpers";
import type { BorrowPayload } from "@/types/mac";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard("user");
  if (g instanceof Response) return g;
  try {
    const body = (await req.json()) as Partial<BorrowPayload>;
    if (!body.peminjam || !body.unitIds?.length) {
      return NextResponse.json(
        { ok: false, error: "Nama peminjam dan minimal 1 unit wajib diisi." },
        { status: 400 }
      );
    }
    const data = await borrow({
      peminjam: body.peminjam,
      divisi: body.divisi || "",
      kegiatan: body.kegiatan || "",
      kembaliRencana: body.kembaliRencana || "",
      catatan: body.catatan || "",
      unitIds: body.unitIds,
      createdBy: g.email,
    });
    const { ok: _ok, ...rest } = data;
    void _ok;
    return NextResponse.json({ ok: true, ...rest });
  } catch (err) {
    return NextResponse.json({ ok: false, error: msg(err) }, { status: 500 });
  }
}

function msg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
