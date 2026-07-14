import { NextResponse } from "next/server";
import { getConfig } from "@/lib/mac-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getConfig();
    return NextResponse.json({ ok: true, config: data.config ?? null });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
