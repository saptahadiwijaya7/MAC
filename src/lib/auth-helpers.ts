import { auth } from "@/auth";
import { roleAtLeast, type Role } from "@/lib/roles";

export type { Role };

export async function sessionUser(): Promise<{ email: string; role: Role; authenticated: boolean }> {
  const s = await auth();
  const email = s?.user?.email || "";
  const role = ((s?.user?.role as Role) || "viewer") as Role;
  return { email, role, authenticated: !!s?.user };
}

/** Returns the session user if allowed, or a Response to return if not. */
export async function guard(min: Role): Promise<{ email: string; role: Role } | Response> {
  const { email, role, authenticated } = await sessionUser();
  if (!authenticated)
    return new Response(JSON.stringify({ ok: false, error: "belum login" }), { status: 401 });
  if (!roleAtLeast(role, min))
    return new Response(JSON.stringify({ ok: false, error: "akses ditolak (butuh " + min + ")" }), { status: 403 });
  return { email, role };
}
