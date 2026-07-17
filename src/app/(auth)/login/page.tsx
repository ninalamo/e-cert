import LoginForm from "@/features/auth/components/login-form";
import VerifySearch from "@/features/certificates/components/verify-search";

export default function LoginPage() {
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

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase tracking-wide text-tertiary">
            Staff sign in
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
