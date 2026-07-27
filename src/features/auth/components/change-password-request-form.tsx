"use client";

import { useActionState } from "react";
import { requestPasswordChange } from "@/features/auth/server/auth.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChangePasswordRequestForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | undefined) => {
      return requestPasswordChange();
    },
    undefined
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-brand-700">Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        {state?.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{state.error}</div>
        )}
        {state?.success ? (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
            Check your email for the password change link.
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <p className="text-sm text-secondary">
              We&apos;ll send a link to your email so you can set a new password.
            </p>
            <button
              type="submit"
              disabled={pending}
              className="btn-brand disabled:opacity-50"
            >
              {pending ? "Sending..." : "Send Password Change Link"}
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
