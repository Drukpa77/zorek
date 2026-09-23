"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthFormState } from "@/app/admin/login/actions";

export function ForgotPasswordForm({ hintEmail }: { hintEmail: string }) {
  const [state, action, pending] = useActionState(requestPasswordReset, null as AuthFormState);

  return (
    <form action={action} className="admin-form">
      <span className="font-mono text-[10px] tracking-[0.08em] text-on-dark-muted uppercase">
        /Admin · Password reset
      </span>
      <h1 className="m-0 text-[clamp(28px,8vw,32px)] font-semibold tracking-[-0.04em]">Forgot password</h1>
      {state?.error ? (
        <p role="alert" className="m-0 text-[13px] text-alert">
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p role="status" className="m-0 text-[13px] leading-normal text-on-dark-body">
          {state.message}
        </p>
      ) : (
        <p className="m-0 text-[13px] leading-normal text-on-dark-body">
          Enter the email on the admin account. Reset mail is sent only when email delivery is configured.
        </p>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] tracking-[0.08em] text-on-dark-muted uppercase">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          autoCapitalize="none"
          spellCheck={false}
          placeholder={hintEmail}
          className="admin-input"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-[4px] bg-acc text-center text-base font-medium text-white disabled:opacity-60"
      >
        {pending ? "Sending" : "Send reset link"}
      </button>
      <Link href="/admin/login" className="site-link inline-flex min-h-11 items-center text-[12.5px] text-on-dark-muted">
        Back to sign in
      </Link>
    </form>
  );
}
