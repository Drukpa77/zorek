"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { lockMinutes } from "@/lib/lockout";

export type AuthFormState = { error?: string; message?: string } | null;

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

  const email = parsed.data.email.toLowerCase();
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
