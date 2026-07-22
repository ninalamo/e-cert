import { notFound } from "next/navigation";
import { getMyCertificate } from "@/features/certificates/server/certificate.service";
import { getEvent } from "@/features/events/server/event.service";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { requireSession } from "@/lib/permissions";
import CertificateDetail from "@/features/certificates/components/certificate-detail";

export default async function MyCertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const certificate = await getMyCertificate(id, session.email!);
  if (!certificate) notFound();

  const event = certificate.event_id ? await getEvent(certificate.event_id) : null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify?number=${encodeURIComponent(certificate.certificate_number)}`;
  const qrDataUrl = await generateQrCodeDataUrl(verifyUrl, { width: 200, margin: 2 });

  return (
    <CertificateDetail
      certificate={certificate}
      event={event}
      qrDataUrl={qrDataUrl}
      isAdmin={false}
      eventIdParam={null}
    />
  );
}
