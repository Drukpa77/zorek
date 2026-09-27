import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";

const rank: Record<Role, number> = {
  AUTHOR: 1,
  EDITOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export async function requireRole(minimum: Role = "AUTHOR") {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || !role) redirect("/admin/login");
  if (rank[role] < rank[minimum]) redirect("/admin");
  return session.user;
}
