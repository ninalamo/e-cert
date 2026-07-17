import EditTemplateForm from "./edit-template-form";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditTemplateForm id={id} />;
}
