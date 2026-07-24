import { NextResponse } from "next/server";
import { saveOpname, listOpname } from "@/lib/mac-api";
import { guard } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listOpname();
    return NextResponse.json({ ok: true, opname: data.opname ?? [] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: msg(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const g = await guard("user");
  if (g instanceof Response) return g;
  try {
    const body = (await req.json()) as {
      catatan?: string;
      items: { unitId: string; hasil: string; lokasiBaru?: string; kondisiBaru?: string }[];
    };
    if (!body.items?.length) {
      return NextResponse.json({ ok: false, error: "Belum ada unit yang dicek." }, { status: 400 });
    }
    const data = await saveOpname({ ...body, operator: g.email });
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
