"use client";

import { useActionState } from "react";
import { updateEmail } from "@/features/auth/server/auth.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UpdateEmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean }, formData: FormData) => {
      const email = String(formData.get("email") ?? "");
      if (!email || email === currentEmail) {
        return { error: "Enter a different email address" };
      }
      return updateEmail({ email });
    },
    undefined
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-brand-700">Update Email</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{state.error}</div>
          )}
          {state?.success && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
              Confirmation link sent to your new email. Verify it to complete the change.
            </div>
          )}
          <div className="flex gap-2">
            <input
              name="email"
              type="email"
              defaultValue={currentEmail}
              required
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={pending}
              className="btn-brand disabled:opacity-50"
            >
              {pending ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
