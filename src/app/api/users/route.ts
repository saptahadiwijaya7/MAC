import { NextResponse } from "next/server";
import { getUsers, addUser, updateUser, deleteUser } from "@/lib/mac-api";
import { guard } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard("admin");
  if (g instanceof Response) return g;
  try {
    const data = await getUsers();
    return NextResponse.json({ ok: true, users: data.users ?? [] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const g = await guard("admin");
  if (g instanceof Response) return g;
  void g;
  try {
    const body = await req.json();
    const op = body.op as string;
    if (op === "add") {
      const d = await addUser({ name: body.name, email: body.email, password: body.password, role: body.role });
      return NextResponse.json({ ok: true, email: d.email });
    }
    if (op === "update") {
      await updateUser({ email: body.email, name: body.name, role: body.role, active: body.active, password: body.password });
      return NextResponse.json({ ok: true });
    }
    if (op === "delete") {
      await deleteUser(body.email);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "op tidak dikenal" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
