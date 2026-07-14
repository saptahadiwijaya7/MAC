import { NextResponse } from "next/server";
import { setDivisions } from "@/lib/mac-api";
import { guard } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard("admin");
  if (g instanceof Response) return g;
  void g;
  try {
    const body = (await req.json()) as { divisions?: string[] };
    if (!Array.isArray(body.divisions)) {
      return NextResponse.json({ ok: false, error: "divisions harus array" }, { status: 400 });
    }
    const data = await setDivisions(body.divisions);
    return NextResponse.json({ ok: true, divisions: data.divisions ?? [] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
