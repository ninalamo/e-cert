import EditAuthEmailForm from "./edit-auth-email-form";

export default async function EditAuthEmailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditAuthEmailForm id={id} />;
}
