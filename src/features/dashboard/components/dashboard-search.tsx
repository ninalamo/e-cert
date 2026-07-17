"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function DashboardSearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const params = new URLSearchParams();
    if (orgId) params.set("org", orgId);
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

export default function DashboardSearch() {
  return (
    <Suspense fallback={<div className="flex gap-2">
      <div className="flex-1 rounded-md border px-3 py-2 text-sm bg-gray-50" />
      <div className="rounded-md bg-gray-100 px-4 py-2 text-sm w-20" />
    </div>}>
      <DashboardSearchInner />
    </Suspense>
  );
}
