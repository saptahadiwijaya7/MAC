import { NextResponse } from "next/server";
import { uploadPhoto } from "@/lib/mac-api";
import type { UploadPhotoPayload } from "@/types/mac";
import { guard } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard("admin");
  if (g instanceof Response) return g;
  void g;
  try {
    const body = (await req.json()) as Partial<UploadPhotoPayload>;
    if (!body.unitId || !body.base64) {
      return NextResponse.json({ ok: false, error: "unitId & foto wajib." }, { status: 400 });
    }
    const data = await uploadPhoto({
      unitId: body.unitId,
      base64: body.base64,
      mimeType: body.mimeType || "image/jpeg",
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
