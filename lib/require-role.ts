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
  if (!session?.user || !role || rank[role] < rank[minimum]) {
    throw new Error("Unauthorized");
  }
  return session.user;
}
