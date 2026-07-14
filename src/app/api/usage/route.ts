import { NextResponse } from "next/server";
import { getUsage } from "@/lib/mac-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const data = await getUsage(from, to);
    return NextResponse.json({ ok: true, usage: data.usage ?? [] });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
