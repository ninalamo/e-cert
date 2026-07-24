"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export interface VerificationResult {
  valid: boolean;
  id?: string;
  certificate_number?: string;
  recipient_name?: string;
  issued_date?: string;
  valid_until?: string;
  status?: string;
  error?: string;
  organization?: {
    name: string;
  } | null;
  event?: {
    name: string;
    description: string | null;
    event_date: string | null;
    location: string | null;
    organizer: string | null;
    certificate_title: string | null;
  } | null;
}

function VerifySearchInner() {
  const searchParams = useSearchParams();
  const initialNumber = searchParams.get("number") || "";

  const [number, setNumber] = useState(initialNumber);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setSubmitted(true);

    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(number)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Certificate not found");
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to verify certificate. Please try again.");
    }

    setLoading(false);
  }

  function formatDate(value: string | undefined) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getStatusBadge(status?: string) {
    if (status === "expired") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          <span className="relative h-1.5 w-1.5 rounded-full bg-amber-500" />
          Expired
        </span>
      );
    }
    if (status === "revoked") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <span className="relative h-1.5 w-1.5 rounded-full bg-red-500" />
          Revoked
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
        <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Valid
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="relative">
          <label htmlFor="verify-number" className="sr-only">
            Certificate Number
          </label>
          <input
            id="verify-number"
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value.toUpperCase())}
            placeholder="CERT-000001"
            required
            disabled={loading}
            className="w-full px-4 py-4 pr-12 text-base bg-white dark:bg-surface-elevated border border-border rounded-xl placeholder:text-tertiary/50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            autoComplete="off"
            autoFocus={!initialNumber}
          />
          {number && !loading && (
            <button
              type="button"
              onClick={() => setNumber("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary/50 hover:text-tertiary transition-colors"
              aria-label="Clear input"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !number.trim()}
          className="w-full py-4 px-6 text-base font-semibold text-white bg-brand-700 rounded-xl hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-700/30 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Verifying...
            </span>
          ) : (
            "Verify Certificate"
          )}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 dark:border-red-900/30 dark:bg-red-900/20 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 shrink-0 w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L10.586 10l-3.293 3.293a1 1 0 101.414 1.414L12 11.414l3.293 3.293a1 1 0 001.414-1.414L13.414 10l3.293-3.293a1 1 0 00-1.414-1.414L12 8.586 8.707 5.293a1 1 0 00-1.414 0z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {result && result.valid && (
        <div className="rounded-2xl border border-border bg-white dark:bg-surface-elevated overflow-hidden animate-in fade-in duration-300 slide-in-from-bottom-2">
          <div className="px-6 py-5 border-b border-border bg-surface-muted/50 dark:bg-surface-elevated/50">
            <div className="flex items-center justify-between gap-3">
              {getStatusBadge(result.status)}
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50">
                <span className="text-sm text-tertiary">Certificate Number</span>
                <span className="font-mono font-medium text-primary text-sm break-all text-right max-w-[65%]">{result.certificate_number}</span>
              </div>

              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50">
                <span className="text-sm text-tertiary">Recipient</span>
                <span className="font-medium text-primary text-sm truncate text-right max-w-[65%]">{result.recipient_name}</span>
              </div>

              {result.event && (
                <>
                  <div className="pt-2 border-t border-border" />
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-brand/5 border-border/50">
                    <span className="text-sm font-medium text-brand">Event Details</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50">
                    <span className="text-sm text-tertiary">Event</span>
                    <span className="font-medium text-primary text-sm truncate text-right max-w-[65%]">{result.event.name}</span>
                  </div>
                  {result.event.event_date && (
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50">
                      <span className="text-sm text-tertiary">Event Date</span>
                      <span className="font-medium text-primary text-sm">{formatDate(result.event.event_date)}</span>
                    </div>
                  )}
                  {result.event.location && (
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50">
                      <span className="text-sm text-tertiary">Location</span>
                      <span className="font-medium text-primary text-sm truncate text-right max-w-[65%]">{result.event.location}</span>
                    </div>
                  )}
                  {result.event.organizer && (
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50">
                      <span className="text-sm text-tertiary">Organizer</span>
                      <span className="font-medium text-primary text-sm truncate text-right max-w-[65%]">{result.event.organizer}</span>
                    </div>
                  )}
                  {result.event.certificate_title && (
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50">
                      <span className="text-sm text-tertiary">Title</span>
                      <span className="font-medium text-primary text-sm truncate text-right max-w-[65%]">{result.event.certificate_title}</span>
                    </div>
                  )}
                </>
              )}

              {result.organization && (
                <>
                  <div className="pt-2 border-t border-border" />
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50">
                    <span className="text-sm text-tertiary">Issued By</span>
                    <span className="font-medium text-primary text-sm truncate text-right max-w-[65%]">{result.organization.name}</span>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-border" />
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50">
                <span className="text-sm text-tertiary">Issued</span>
                <span className="font-medium text-primary text-sm">{formatDate(result.issued_date)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50">
                <span className="text-sm text-tertiary">Valid Until</span>
                <span className="font-medium text-primary text-sm">{formatDate(result.valid_until) || "No expiry"}</span>
              </div>
            </div>

            {result.id && (
              <a
                href={`/my/certificates/${result.id}`}
                className="mt-4 block w-full py-3.5 px-6 text-center text-base font-semibold text-white bg-brand rounded-xl hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 transition-all duration-200 active:scale-[0.98]"
              >
                View Certificate
              </a>
            )}
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