import ForgotPasswordForm from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-muted p-4 light-override">
      <div className="app-card w-full max-w-md space-y-6 p-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-primary">Reset your password</h1>
          <p className="text-sm text-tertiary">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}
