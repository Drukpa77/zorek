import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";

// Creates the admin the first time someone signs in, using the host's
// SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD. It does not reset an account
// that already exists, and it does not fall back to the local demo password.
export async function ensureAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return { configured: false as const };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { configured: true as const };

  await prisma.user.create({
    data: {
      email,
      name: "[Founder name]",
      role: "SUPER_ADMIN",
      passwordHash: await hashPassword(password),
    },
  });
  return { configured: true as const };
}
