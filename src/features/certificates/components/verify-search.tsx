"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export interface VerificationResult {
  valid: boolean;
  certificate_number?: string;
  recipient_name?: string;
  issued_date?: string;
  valid_until?: string;
  status?: string;
  error?: string;
}

function VerifySearchInner() {
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
    <div className="space-y-3">
      <form onSubmit={handleVerify} className="space-y-3">
        <div>
          <input
            id="verify-number"
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Certificate number e.g. CERT-000001"
            required
            className="input"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !number}
          className="btn-brand w-full disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify Certificate"}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border bg-danger-bg p-3 text-center">
          <p className="text-sm font-medium text-danger-text">{error}</p>
        </div>
      )}

      {result && result.valid && (
        <div className="space-y-3 rounded-xl border bg-success-bg p-4">
          <div className="flex items-center gap-2">
            <span className="status-pill status-active">VALID</span>
            {result.status === "expired" && (
              <span className="status-pill status-warning">EXPIRED</span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-tertiary">Certificate</span>
              <span className="font-mono font-medium text-primary">{result.certificate_number}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-tertiary">Recipient</span>
              <span className="font-medium text-primary">{result.recipient_name}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-tertiary">Issued</span>
              <span className="text-primary">
                {result.issued_date
                  ? new Date(result.issued_date).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-tertiary">Valid until</span>
              <span className="text-primary">
                {result.valid_until
                  ? new Date(result.valid_until).toLocaleDateString()
                  : "No expiry"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifySearch() {
  return (
    <Suspense fallback={null}>
      <VerifySearchInner />
    </Suspense>
  );
}
