import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { login } from "@/lib/mac-api";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        const email = String(creds?.email || "").toLowerCase().trim();
        const password = String(creds?.password || "");
        if (!email || !password) return null;
        try {
          const res = await login(email, password);
          if (!res.ok || !res.user) return null;
          const u = res.user as { name: string; email: string; role: string };
          return { id: u.email, name: u.name, email: u.email, role: u.role };
        } catch {
          return null;
        }
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role || "viewer";
      }
      if (!token.role) token.role = "viewer";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as string) || "viewer";
      }
      return session;
    },
  },
});
