import { NextResponse } from "next/server";
import { ping } from "@/lib/mac-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await ping();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: msg(err) }, { status: 500 });
  }
}

function msg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
