"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthFormState } from "@/app/admin/login/actions";

const initial: AuthFormState = null;

export function SignInForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <form action={action} className="admin-form">
      <span className="font-mono text-[10px] tracking-[0.08em] text-on-dark-muted uppercase">
        /Admin · Secure sign-in
      </span>
      <h1 className="m-0 text-[clamp(28px,8vw,32px)] font-semibold tracking-[-0.04em]">Sign in</h1>
      {state?.error ? (
        <p role="alert" className="m-0 text-[13px] text-alert">
          {state.error}
        </p>
      ) : null}
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] tracking-[0.08em] text-on-dark-muted uppercase">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          className="admin-input"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] tracking-[0.08em] text-on-dark-muted uppercase">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="admin-input"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-[4px] bg-acc text-center text-base font-medium text-white disabled:opacity-60"
      >
        {pending ? "Signing in" : "Sign in"}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12.5px] text-on-dark-muted">
        <Link href="/admin/forgot" className="site-link inline-flex min-h-11 items-center">
          Forgot password?
        </Link>
        <span className="font-mono text-[10px] tracking-[0.08em] uppercase">MFA · Ready</span>
      </div>
    </form>
  );
}
