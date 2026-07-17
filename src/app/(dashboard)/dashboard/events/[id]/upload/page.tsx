import UploadCsvForm from "./upload-csv-form";

export default async function UploadCsvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UploadCsvForm eventId={id} />;
}
