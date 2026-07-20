import UploadCsvForm from "./upload-csv-form";
import { getCurrentSession } from "@/lib/permissions";

export default async function UploadCsvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getCurrentSession();
  const isAdmin = session?.role === "admin";
  return <UploadCsvForm eventId={id} isAdmin={isAdmin} />;
}
