"use client";

import { useState } from "react";
import { inviteMemberAction } from "../server/organization.actions";

interface InviteMemberFormProps {
  organizationId: string;
  onInvited: () => void;
}

export default function InviteMemberForm({ organizationId, onInvited }: InviteMemberFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    const result = await inviteMemberAction(organizationId, email);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onInvited();
      setLoading(false);
      (e.target as HTMLFormElement).reset();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="email"
        type="email"
        placeholder="Member email"
        required
        className="flex-1 rounded-md border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Adding..." : "Invite"}
      </button>
      {error && (
        <p className="w-full text-sm text-red-600">{error}</p>
      )}
    </form>
  );
}
