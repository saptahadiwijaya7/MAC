import { NextResponse } from "next/server";
import { getHistory } from "@/lib/mac-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const transactions = await getHistory();
    return NextResponse.json({ ok: true, transactions });
  } catch (err) {
    return NextResponse.json({ ok: false, error: msg(err) }, { status: 500 });
  }
}

function msg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
