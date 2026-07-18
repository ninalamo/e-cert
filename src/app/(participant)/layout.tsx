import ParticipantShell from "@/components/participant-shell";
import { requireRole } from "@/lib/permissions";

export default async function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["participant"], "/login");
  return <ParticipantShell session={session}>{children}</ParticipantShell>;
}
