import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CertificateRepository } from "@/features/certificates/server/certificate.repository";
import { CertificateTemplateRepository } from "@/features/templates/server/template.repository";
import { EventRepository } from "@/features/events/server/event.repository";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { ORG_NAME } from "@/lib/org";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const certRepo = new CertificateRepository(supabase);
  const certificate = await certRepo.findById(id);

  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  if (certificate.revoked_at) {
    return NextResponse.json({ error: "Certificate has been revoked" }, { status: 410 });
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

  return NextResponse.json({
    certificate,
    template,
    event,
    qrDataUrl,
    orgName: ORG_NAME,
  });
}
