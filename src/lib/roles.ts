export type Role = "admin" | "user" | "viewer";

const RANK: Record<Role, number> = { viewer: 0, user: 1, admin: 2 };

export function roleAtLeast(role: string | undefined, min: Role): boolean {
  const r = (role as Role) || "viewer";
  return (RANK[r] ?? 0) >= RANK[min];
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  user: "User",
  viewer: "Viewer",
};
