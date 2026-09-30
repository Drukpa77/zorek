import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";

const KNOWN_WEAK = new Set(["demopassword", "password", "changeme", "admin", "letmein"]);
const MIN_LENGTH = 12;

// In production the bootstrap account must not be guessable: anyone can
// trigger ensureAdmin() by attempting a sign-in, so values copied from
// .env.example would hand a stranger a Super Admin account.
function unsafeCredentials(email: string, password: string) {
  if (process.env.NODE_ENV !== "production") return null;
  if (email.endsWith("@example.com")) return "SEED_ADMIN_EMAIL is still the example address.";
  if (password.length < MIN_LENGTH || KNOWN_WEAK.has(password.toLowerCase())) {
    return `SEED_ADMIN_PASSWORD must be at least ${MIN_LENGTH} characters and not a demo value.`;
  }
  return null;
}

// Creates the admin the first time someone signs in, using the host's
// SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD. It does not reset an account
// that already exists, and it does not fall back to the local demo password.
export async function ensureAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return { configured: false as const };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { configured: true as const };

  const problem = unsafeCredentials(email, password);
  if (problem) {
    console.error(`[admin] Refusing to create the first admin: ${problem}`);
    return { configured: false as const, unsafe: true as const };
  }

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
