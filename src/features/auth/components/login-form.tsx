"use client";

import { useState } from "react";
import { login } from "../server/auth.actions";
import type { LoginInput } from "../schemas/auth.schema";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: LoginInput = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const result = await login(data);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border bg-danger-bg p-3 text-sm text-danger-text">
            {error}
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
          disabled={loading}
          className="btn-brand w-full disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
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
