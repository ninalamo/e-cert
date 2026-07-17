"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const params = new URLSearchParams();
    params.set("q", query.trim());
    router.push(`/dashboard/certificates?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search certificates..."
        className="flex-1 rounded-md border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
      >
        Search
      </button>
    </form>
  );
}
