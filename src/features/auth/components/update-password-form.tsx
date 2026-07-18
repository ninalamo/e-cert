"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "../server/auth.actions";

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;

    const result = await updatePassword({ password });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setDone(true);
    const dest = result?.redirectTo ?? "/login";
    setTimeout(() => router.push(dest), 1200);
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-success-bg p-3 text-sm text-success-text">
        Password updated. Redirecting to your dashboard...
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
            htmlFor="password"
            className="block text-sm font-medium text-secondary"
          >
            New Password
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

        <button
          type="submit"
          disabled={loading}
          className="btn-brand w-full disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
