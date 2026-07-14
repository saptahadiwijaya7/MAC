import { NextResponse } from "next/server";
import { getTransaction, updateTransaction, deleteTransaction } from "@/lib/mac-api";
import { guard } from "@/lib/auth-helpers";
import type { UpdateTransactionPayload } from "@/types/mac";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transaction = await getTransaction(id);
    if (!transaction) {
      return NextResponse.json(
        { ok: false, error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, transaction });
  } catch (err) {
    return NextResponse.json({ ok: false, error: msg(err) }, { status: 500 });
  }
}

// Edit an open transaction (header fields + add/remove units). Requires "user".
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard("user");
  if (g instanceof Response) return g;
  try {
    const { id } = await params;
    const body = (await req.json()) as Partial<UpdateTransactionPayload>;
    const data = await updateTransaction({ ...body, transactionId: id });
    const { ok: _ok, ...rest } = data;
    void _ok;
    return NextResponse.json({ ok: true, ...rest });
  } catch (err) {
    return NextResponse.json({ ok: false, error: msg(err) }, { status: 500 });
  }
}

// Delete an active transaction (frees still-borrowed units). Requires "admin".
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard("admin");
  if (g instanceof Response) return g;
  try {
    const { id } = await params;
    const data = await deleteTransaction(id);
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
