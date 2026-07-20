import { requireSession } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { CertificateRepository } from "@/features/certificates/server/certificate.repository";
import { CertificateTemplateRepository } from "@/features/templates/server/template.repository";
import { EventRepository } from "@/features/events/server/event.repository";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { ORG_NAME } from "@/lib/org";
import { notFound, redirect } from "next/navigation";
import CertificateViewer from "./certificate-viewer";

export default async function CertificateViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const supabase = await createClient();
  const certRepo = new CertificateRepository(supabase);
  const certificate = await certRepo.findById(id);

  if (!certificate) notFound();

  if (session.role === "participant" && certificate.recipient_email !== session.email) {
    redirect("/my/certificates");
  }

  let template = null;
  if (certificate.template_id) {
    const templateRepo = new CertificateTemplateRepository(supabase);
    template = await templateRepo.findById(certificate.template_id);
  }

  let event = null;
  if (certificate.event_id) {
    const eventRepo = new EventRepository(supabase);
    event = await eventRepo.findById(certificate.event_id);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify?number=${certificate.certificate_number}`;
  const qrDataUrl = await generateQrCodeDataUrl(verifyUrl, { width: 200, margin: 2 });

  return (
    <CertificateViewer
      certificate={certificate}
      template={template}
      event={event}
      qrDataUrl={qrDataUrl}
      orgName={ORG_NAME}
    />
  );
}
