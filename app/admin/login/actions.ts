"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { ensureAdmin } from "@/lib/ensure-admin";
import { lockMinutes } from "@/lib/lockout";

export type AuthFormState = { error?: string; message?: string } | null;

function prismaUserCount() {
  return prisma.user.count();
}

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export async function login(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  if (!process.env.AUTH_SECRET) {
    return { error: "AUTH_SECRET is missing on this server, so sign-in cannot start." };
  }

  const email = parsed.data.email.toLowerCase();
  try {
    const admin = await ensureAdmin();
    if (!admin.configured && (await prismaUserCount()) === 0) {
      return {
        error:
          "This server has no admin account yet. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in the host settings, then try again.",
      };
    }
  } catch {
    return {
      error: "Sign-in cannot reach the database. Check DATABASE_URL, and run the database migrations on the host.",
    };
  }

  const lockedFor = await lockMinutes(email);
  if (lockedFor) {
    return {
      error: `Too many attempts. Try again in ${lockedFor} ${lockedFor === 1 ? "minute" : "minutes"}.`,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const again = await lockMinutes(email);
      if (again) {
        return {
          error: `Too many attempts. Try again in ${again} ${again === 1 ? "minute" : "minutes"}.`,
        };
      }
      return { error: "Email or password is incorrect." };
    }
    throw error;
  }

  return null;
}

const forgotSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
});

export async function requestPasswordReset(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email." };
  }

  const lockedFor = await lockMinutes(parsed.data.email);
  if (lockedFor) {
    return {
      error: `Too many attempts. Try again in ${lockedFor} ${lockedFor === 1 ? "minute" : "minutes"}.`,
    };
  }

  return {
    message: "If an account exists for that email, a reset link will be sent once email delivery is configured.",
  };
}
