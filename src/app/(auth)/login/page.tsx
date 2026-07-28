import Link from "next/link";
import LoginForm from "@/features/auth/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-muted p-4 light-override">
      <div className="app-card w-full max-w-md space-y-6 p-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-primary">LOA VERICERT</h1>
          <p className="text-sm text-tertiary">
            Sign in to manage certificates and events.
          </p>
        </div>

        <LoginForm confirmed={params.confirmed} error={params.error} />

        <p className="text-center text-sm text-tertiary">
          Want to verify a certificate?{" "}
          <Link href="/verify" className="font-medium text-brand hover:underline">
            Verify here
          </Link>
        </p>
      </div>
    </div>
  );
}
