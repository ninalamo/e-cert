import Link from "next/link";
import { requireSession } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MyDashboardPage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">My Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.name ?? session.email}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/my/certificates">
          <Card className="transition-colors hover:border-brand-600">
            <CardHeader>
              <CardTitle className="text-brand-700">My Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-secondary">
                View and download your issued certificates.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/my/profile">
          <Card className="transition-colors hover:border-brand-600">
            <CardHeader>
              <CardTitle className="text-brand-700">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-secondary">
                View and manage your account details.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
