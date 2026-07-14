import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) return;
  if (isLoggedIn) return;

  if (pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ ok: false, error: "belum login" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  if (!pathname.startsWith("/login")) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};
