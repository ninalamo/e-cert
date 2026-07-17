import DashboardShell from "@/components/dashboard-shell";
import { requireRole } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["admin", "staff"], "/login");
  return <DashboardShell session={session}>{children}</DashboardShell>;
}
