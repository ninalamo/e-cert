import { notFound } from "next/navigation";
import { getCertificate } from "@/features/certificates/server/certificate.service";
import { getEvent } from "@/features/events/server/event.service";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { requireRole } from "@/lib/permissions";
import CertificateDetail from "@/features/certificates/components/certificate-detail";

export default async function CertificateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { id } = await params;
  const { eventId } = await searchParams;

  const session = await requireRole(["admin", "staff", "participant"]);

  const certificate = await getCertificate(id);
  if (!certificate) notFound();

  const eventToShow = eventId || certificate.event_id;
  const event = eventToShow ? await getEvent(eventToShow) : null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify?number=${encodeURIComponent(certificate.certificate_number)}`;
  const qrDataUrl = await generateQrCodeDataUrl(verifyUrl, { width: 200, margin: 2 });

  return (
    <CertificateDetail
      certificate={certificate}
      event={event}
      qrDataUrl={qrDataUrl}
      isAdmin={session.role === "admin" || session.role === "staff"}
      eventIdParam={eventId ?? null}
    />
  );
}
