import { requireSession } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UpdateEmailForm from "./update-email-form";

export default async function MyProfilePage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Profile</h1>
        <p className="text-sm text-secondary">
          Your account information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-brand-700">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-tertiary">Name</p>
              <p className="font-medium text-primary">{session.name ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-tertiary">Email</p>
              <p className="text-primary">{session.email ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-tertiary">Role</p>
              <p className="capitalize text-primary">{session.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <UpdateEmailForm currentEmail={session.email ?? ""} />
    </div>
  );
}
