import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";
import { canAccess } from "@/lib/admin-nav";

export async function requireRole(minimum: Role = "AUTHOR") {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || !role) redirect("/admin/login");
  if (!canAccess(role, minimum)) redirect("/admin");
  return session.user;
}
