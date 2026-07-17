import IssueEventCertForm from "./issue-event-cert-form";

export default async function IssueEventCertPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IssueEventCertForm eventId={id} />;
}
