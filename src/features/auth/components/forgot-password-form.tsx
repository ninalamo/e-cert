"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "../server/auth.actions";

export default function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    const result = await forgotPassword({ email });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-success-bg p-3 text-sm text-success-text">
          If an account exists for that email, we&apos;ve sent password reset
          instructions.
        </div>
        <p className="text-center text-sm text-tertiary">
          <Link href="/login" className="font-medium text-brand-700 underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
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
          <label
            htmlFor="email"
            className="block text-sm font-medium text-secondary"
          >
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

        <button
          type="submit"
          disabled={loading}
          className="btn-brand w-full disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="text-center text-sm text-tertiary">
        <Link href="/login" className="font-medium text-brand-700 underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
