import { NextResponse } from "next/server";
import { archiveUnit, unarchiveUnit, listArchived } from "@/lib/mac-api";
import { guard } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard("admin");
  if (g instanceof Response) return g;
  try {
    const data = await listArchived();
    return NextResponse.json({ ok: true, archived: data.archived ?? [] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: msg(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const g = await guard("admin");
  if (g instanceof Response) return g;
  try {
    const body = (await req.json()) as { unitId?: string; restore?: boolean; reason?: string };
    if (!body.unitId) return NextResponse.json({ ok: false, error: "unitId wajib" }, { status: 400 });
    const data = body.restore
      ? await unarchiveUnit(body.unitId)
      : await archiveUnit(body.unitId, g.email, body.reason);
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
