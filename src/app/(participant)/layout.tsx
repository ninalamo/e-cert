import DashboardShell from "@/components/dashboard-shell";
import { requireSession } from "@/lib/permissions";

export default async function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  return <DashboardShell session={session}>{children}</DashboardShell>;
}
