import { getPhoto } from "@/lib/mac-api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { mimeType, base64 } = await getPhoto(id);
    if (!base64) return new Response("Not found", { status: 404 });
    const bytes = Buffer.from(base64, "base64");
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "error", { status: 500 });
  }
}
