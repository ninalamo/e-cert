import EditEmailTemplateForm from "./edit-email-template-form";

export default async function EditEmailTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditEmailTemplateForm id={id} />;
}
