"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { loginAction } from "../server/auth.actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const navigated = useRef(false);

  useEffect(() => {
    if (state?.success && !navigated.current) {
      navigated.current = true;
      window.location.href = state.redirectTo ?? "/dashboard";
    }
  }, [state?.success, state?.redirectTo]);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="rounded-xl border bg-danger-bg p-3 text-sm text-danger-text">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-secondary">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="input mt-1"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-secondary">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="input mt-1"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="btn-brand w-full disabled:opacity-50"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="flex items-center justify-between">
        <p className="text-sm text-tertiary">
          Don&apos;t have an account?{" "}
          <a href="/register" className="font-medium text-brand-700 underline">
            Register
          </a>
        </p>
        <a
          href="/forgot-password"
          className="text-sm font-medium text-brand-700 underline"
        >
          Forgot password?
        </a>
      </div>
    </div>
  );
}
