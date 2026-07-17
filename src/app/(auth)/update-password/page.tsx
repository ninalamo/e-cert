import UpdatePasswordForm from "@/features/auth/components/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-muted p-4 light-override">
      <div className="app-card w-full max-w-md space-y-6 p-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-primary">Set a new password</h1>
          <p className="text-sm text-tertiary">
            Choose a new password for your account.
          </p>
        </div>

        <UpdatePasswordForm />
      </div>
    </div>
  );
}
