import { NextRequest, NextResponse } from "next/server";
import { CertificateRepository } from "@/features/certificates/server/certificate.repository";
import { getCertificatePdfBuffer } from "@/features/certificates/server/certificate.service";
import { renderHtmlToPdf } from "@/lib/pdf";
import { generateQrCode } from "@/lib/qr";
import { ORG_NAME } from "@/lib/org";
import { env } from "@/lib/env";
import { renderTemplate } from "@/lib/template-renderer";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentSession } from "@/lib/permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certRepo = new CertificateRepository(supabaseAdmin);
  const certificate = await certRepo.findById(id);

  if (!certificate) {
    console.error(`[download] Certificate not found: ${id}`);
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  if (session.role !== "admin" && session.role !== "staff" && certificate.recipient_email !== session.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (certificate.revoked_at) {
    console.warn(`[download] Certificate revoked: ${id}`);
    return NextResponse.json({ error: "Certificate has been revoked" }, { status: 410 });
  }

  const meta = (certificate.metadata as Record<string, unknown> | null) ?? {};

  const cachedPdf = meta.rendered_pdf;
  if (typeof cachedPdf === "string") {
    const pdfBuffer = Buffer.from(cachedPdf, "base64");
    if (pdfBuffer.length > 4 && pdfBuffer.subarray(0, 4).toString() === "%PDF") {
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${certificate.certificate_number}.pdf"`,
        },
      });
    }
  }

  const cachedHtml = meta.rendered_html;
  if (typeof cachedHtml === "string") {
    try {
      const pdfBuffer = await renderHtmlToPdf(cachedHtml, {
        format: "A4",
        landscape: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      if (pdfBuffer.length > 4 && pdfBuffer.subarray(0, 4).toString() === "%PDF") {
        const pdfBase64 = pdfBuffer.toString("base64");
        await certRepo.update(id, {
          metadata: { ...meta, rendered_pdf: pdfBase64 },
        } as never);
        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${certificate.certificate_number}.pdf"`,
          },
        });
      }
    } catch (err) {
      console.error(`[download] PDF render from cached rendered_html failed for ${id}:`, err);
    }
  }

  const { data: pdfBuffer, error: pdfError } = await getCertificatePdfBuffer(certificate);
  if (!pdfBuffer || pdfError) {
    // Continue to on-demand generation
  } else if (pdfBuffer.length > 4 && pdfBuffer.subarray(0, 4).toString() === "%PDF") {
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${certificate.certificate_number}.pdf"`,
        },
      });
    }

  if (certificate.template_id) {
    try {
      const { getTemplate } = await import("@/features/templates/server/template.service");
      const { EventRepository } = await import("@/features/events/server/event.repository");

      const baseUrl = env.client.NEXT_PUBLIC_BASE_URL;
      const verifyUrl = `${baseUrl}/verify?number=${certificate.certificate_number}`;

      const [template, qrBuffer, event] = await Promise.all([
        getTemplate(certificate.template_id),
        generateQrCode(verifyUrl, { width: 128, margin: 1 }),
        certificate.event_id
          ? new EventRepository(supabaseAdmin).findById(certificate.event_id)
          : null,
      ]);

      if (template) {
        const qrDataUrl = `data:image/png;base64,${qrBuffer.toString("base64")}`;

        const renderedHtml = renderTemplate(
          template.html_content,
          template.css_content ?? "",
          {
            recipient_name: certificate.recipient_name,
            certificate_number: certificate.certificate_number,
            issued_date: new Date(certificate.issued_at).toLocaleDateString(),
            organization_name: ORG_NAME,
            event_name: event?.name ?? "",
            event_date: event?.event_date ? new Date(event.event_date).toLocaleDateString() : "",
            event_location: event?.location ?? "",
            event_organizer: event?.organizer ?? "",
            certificate_title: event?.certificate_title ?? "",
            expiry_date: certificate.expires_at ? new Date(certificate.expires_at).toLocaleDateString() : "",
            qr_code: `<img src="${qrDataUrl}" width="128" height="128" />`,
          }
        );

        const pdfBuffer = await renderHtmlToPdf(renderedHtml, {
          format: "A4",
          landscape: true,
          margin: { top: "0", right: "0", bottom: "0", left: "0" },
        });

        const pdfBase64 = pdfBuffer.toString("base64");
        await certRepo.update(id, {
          metadata: { ...(certificate.metadata ?? {}), rendered_pdf: pdfBase64 },
        } as never);

        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${certificate.certificate_number}.pdf"`,
          },
        });
      }
    } catch (err) {
      console.error(`[download] On-demand PDF generation failed for ${id}:`, err);
    }
  }

  console.error(`[download] No PDF source available for ${id} — template_id=${certificate.template_id}, file_path=${certificate.file_path}, metadata keys=${Object.keys(meta).join(",")}`);
  return NextResponse.json({ error: "PDF not available for this certificate" }, { status: 404 });
}
