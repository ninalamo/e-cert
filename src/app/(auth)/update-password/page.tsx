import { Suspense } from "react";
import UpdatePasswordForm from "@/features/auth/components/update-password-form";

export default function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-muted p-4 light-override">
      <div className="app-card w-full max-w-md space-y-6 p-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-primary">Set a new password</h1>
          <p className="text-sm text-tertiary">
            Choose a new password for your account.
          </p>
        </div>

        <Suspense>
          <UpdatePasswordFormWrapper searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function UpdatePasswordFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <UpdatePasswordForm token={token} />;
}
