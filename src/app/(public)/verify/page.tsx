"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface VerificationResult {
  valid: boolean;
  certificate_number?: string;
  recipient_name?: string;
  issued_date?: string;
  status?: string;
  error?: string;
}

function VerifyFormInner() {
  const searchParams = useSearchParams();
  const initialNumber = searchParams.get("number") || "";

  const [number, setNumber] = useState(initialNumber);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(number)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Certificate not found");
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to verify certificate");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Certificate Verification</h1>
          <p className="text-muted-foreground mt-2">
            Enter a certificate number to verify its authenticity.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="number" className="block text-sm font-medium">
              Certificate Number
            </label>
            <input
              id="number"
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. CERT-000001"
              required
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !number}
            className="w-full rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify Certificate"}
          </button>
        </form>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-center">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        {result && result.valid && (
          <div className="rounded-md bg-green-50 border border-green-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 font-medium">
                VALID
              </span>
              {result.status === "expired" && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 font-medium">
                  EXPIRED
                </span>
              )}
            </div>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Certificate:</span>{" "}
                <span className="font-mono font-medium">{result.certificate_number}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Recipient:</span>{" "}
                {result.recipient_name}
              </p>
              <p>
                <span className="text-muted-foreground">Issued:</span>{" "}
                {result.issued_date
                  ? new Date(result.issued_date).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <VerifyFormInner />
    </Suspense>
  );
}
