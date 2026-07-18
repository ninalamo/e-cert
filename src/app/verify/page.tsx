import Link from "next/link";
import VerifySearch from "@/features/certificates/components/verify-search";

export default function VerifyPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-muted p-4 light-override">
      <div className="app-card w-full max-w-md space-y-6 p-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-primary">Certificate Verification</h1>
          <p className="text-sm text-tertiary">
            Enter a certificate number to verify its authenticity.
          </p>
        </div>

        <VerifySearch />

        <p className="text-center text-sm text-tertiary">
          <Link href="/login" className="font-medium text-brand hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
