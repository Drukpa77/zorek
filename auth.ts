import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { clearFailures, lockMinutes, recordFailure } from "@/lib/lockout";
import { verifyPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        if (await lockMinutes(email)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await recordFailure(email);
          return null;
        }

        const valid = await verifyPassword(user.passwordHash, parsed.data.password);
        if (!valid) {
          await recordFailure(email);
          return null;
        }

        await clearFailures(email);
        await prisma.session.create({
          data: {
            userId: user.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
          },
        });
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "auth.sign_in",
            entityType: "User",
            entityId: user.id,
            summary: "Signed in",
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
