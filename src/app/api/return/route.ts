import { NextResponse } from "next/server";
import { processReturn } from "@/lib/mac-api";
import type { ReturnPayload } from "@/types/mac";
import { guard } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard("user");
  if (g instanceof Response) return g;
  void g;
  try {
    const body = (await req.json()) as Partial<ReturnPayload>;
    if (!body.transactionId || !body.returns?.length) {
      return NextResponse.json(
        { ok: false, error: "ID transaksi dan minimal 1 unit wajib." },
        { status: 400 }
      );
    }
    const data = await processReturn({
      transactionId: body.transactionId,
      returns: body.returns,
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
