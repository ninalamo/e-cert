import DashboardGate from "@/components/dashboard-gate";
import IssueEventCertForm from "./issue-event-cert-form";

export default async function IssueEventCertPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DashboardGate description="Your account does not have permission to issue certificates.">
      <IssueEventCertForm eventId={id} />
    </DashboardGate>
  );
}
