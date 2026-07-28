import DashboardShell from "@/components/dashboard-shell";
import { getCurrentSession } from "@/lib/permissions";

export default async function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (session) {
    return <DashboardShell session={session}>{children}</DashboardShell>;
  }
  return <>{children}</>;
}
