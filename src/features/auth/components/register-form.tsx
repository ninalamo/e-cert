"use client";

import { useState } from "react";
import Link from "next/link";
import { register } from "../server/auth.actions";
import type { RegisterInput } from "../schemas/auth.schema";

export default function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: RegisterInput = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    const result = await register(data);

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
          <label htmlFor="name" className="block text-sm font-medium text-secondary">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="input mt-1"
          />
        </div>

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
            minLength={6}
            className="input mt-1"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            className="input mt-1"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-brand w-full disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-tertiary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
