"use client";

import { use } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { VerificationResult } from "@/features/certificates/components/verify-search";

function formatDate(value: string | undefined) {
  if (!value) return "\u2014";
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

export default function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ certificateNumber: string }>;
}) {
  const { certificateNumber } = use(params);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch(
          `/api/verify/${encodeURIComponent(certificateNumber)}`
        );
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
    verify();
  }, [certificateNumber]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-muted p-4 light-overflow">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/10 mb-6">
            <svg
              className="w-8 h-8 text-brand"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">
            Certificate Verification
          </h1>
          <p className="mt-3 text-sm text-tertiary font-mono">
            {certificateNumber}
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-tertiary">
            <svg
              className="animate-spin h-5 w-5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Verifying...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 px-4 py-4">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 shrink-0 w-5 h-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L10.586 10l-3.293 3.293a1 1 0 101.414 1.414L12 11.414l3.293 3.293a1 1 0 001.414-1.414L13.414 10l3.293-3.293a1 1 0 00-1.414-1.414L12 8.586 8.707 5.293a1 1 0 00-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {result && result.valid && (
          <div className="rounded-2xl border border-border bg-white dark:bg-[#1c1c1e] overflow-hidden">
            <div className="px-6 py-5 border-b border-border bg-surface-muted/50 dark:bg-[#2c2c2e]/50">
              <div className="flex items-center justify-between gap-3">
                {getStatusBadge(result.status)}
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50 dark:bg-[#2c2c2e]/50">
                  <span className="text-sm text-tertiary">
                    Certificate Number
                  </span>
                  <span className="font-mono font-medium text-primary text-sm break-all text-right max-w-[65%]">
                    {result.certificate_number}
                  </span>
                </div>

                {result.recipient_name && (
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50 dark:bg-[#2c2c2e]/50">
                    <span className="text-sm text-tertiary">Participant</span>
                    <span className="font-medium text-primary text-sm truncate text-right max-w-[65%]">
                      {result.recipient_name}
                    </span>
                  </div>
                )}

                {result.event_name && (
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50 dark:bg-[#2c2c2e]/50">
                    <span className="text-sm text-tertiary">Event</span>
                    <span className="font-medium text-primary text-sm truncate text-right max-w-[65%]">
                      {result.event_name}
                    </span>
                  </div>
                )}

                {result.organization && (
                  <>
                    <div className="pt-2 border-t border-border" />
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50 dark:bg-[#2c2c2e]/50">
                      <span className="text-sm text-tertiary">
                        Issued By
                      </span>
                      <span className="font-medium text-primary text-sm truncate text-right max-w-[65%]">
                        {result.organization.name}
                      </span>
                    </div>
                  </>
                )}

                <div className="pt-2 border-t border-border" />
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50 dark:bg-[#2c2c2e]/50">
                  <span className="text-sm text-tertiary">Issued</span>
                  <span className="font-medium text-primary text-sm">
                    {formatDate(result.issued_date)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-muted/50 dark:bg-[#2c2c2e]/50">
                  <span className="text-sm text-tertiary">Valid Until</span>
                  <span className="font-medium text-primary text-sm">
                    {formatDate(result.valid_until) || "No expiry"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-tertiary">
          <Link
            href="/verify"
            className="font-medium text-brand hover:underline"
          >
            Verify another certificate
          </Link>
        </p>
      </div>
    </div>
  );
}
