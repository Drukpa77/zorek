"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { isLocked, recordFailure } from "@/lib/lockout";

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
  if (isLocked(email)) {
    return { error: "Too many attempts. Try again later." };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      recordFailure(email);
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

  if (isLocked(parsed.data.email)) {
    return { error: "Too many attempts. Try again later." };
  }

  return {
    message: "If an account exists for that email, a reset link will be sent once email delivery is configured.",
  };
}
