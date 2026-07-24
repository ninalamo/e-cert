import Link from "next/link";
import VerifySearch from "@/features/certificates/components/verify-search";

export default function VerifyPage() {
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
          <p className="mt-3 text-base text-tertiary max-w-xs mx-auto leading-relaxed">
            Enter a certificate number to verify its authenticity and view details.
          </p>
        </div>

        <VerifySearch />

        <p className="mt-8 text-center text-sm text-tertiary">
          <Link href="/login" className="font-medium text-brand hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}