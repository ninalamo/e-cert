"use client";

import { useState } from "react";

export default function HealthPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchHealth() {
    const password = window.prompt("Enter health check password:");
    if (!password) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/health", {
        headers: { "x-health-password": password },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Request failed (${res.status})`);
      } else {
        setData(json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Health Check</h1>
      <button onClick={fetchHealth} disabled={loading} className="btn-brand mb-6">
        {loading ? "Loading..." : "Run Health Check"}
      </button>
      {error && (
        <pre className="bg-red-50 border border-red-200 text-red-700 p-4 rounded whitespace-pre-wrap">
          {error}
        </pre>
      )}
      {data && (
        <pre className="bg-green-50 border border-green-200 p-4 rounded overflow-auto max-h-[70vh] whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
