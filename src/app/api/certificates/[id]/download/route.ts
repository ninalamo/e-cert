import { NextRequest, NextResponse } from "next/server";
import { CertificateRepository } from "@/features/certificates/server/certificate.repository";
import { getCertificatePdfBuffer } from "@/features/certificates/server/certificate.service";
import { renderHtmlToPdf } from "@/lib/pdf";
import { generateQrCode } from "@/lib/qr";
import { ORG_NAME } from "@/lib/org";
import { supabaseAdmin } from "@/lib/supabase";

function renderTemplate(html: string, css: string, variables: Record<string, string>): string {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return `<!DOCTYPE html>
<html>
<head>
  <style>${css}</style>
</head>
<body>
${rendered}
</body>
</html>`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const certRepo = new CertificateRepository(supabaseAdmin);
  const certificate = await certRepo.findById(id);

  if (!certificate) {
    console.error(`[download] Certificate not found: ${id}`);
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
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
      console.log(`[download] Serving cached rendered_pdf for ${id}`);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${certificate.certificate_number}.pdf"`,
        },
      });
    }
    console.warn(`[download] metadata.rendered_pdf exists but invalid for ${id}`);
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
        console.log(`[download] Rendered PDF from cached rendered_html for ${id}`);
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

  try {
    const pdfBuffer = await getCertificatePdfBuffer(certificate);
    if (pdfBuffer.length > 4 && pdfBuffer.subarray(0, 4).toString() === "%PDF") {
      console.log(`[download] Serving PDF from getCertificatePdfBuffer for ${id}`);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${certificate.certificate_number}.pdf"`,
        },
      });
    }
  } catch {
    // Continue to on-demand generation
  }

  if (certificate.template_id) {
    try {
      const { getTemplate } = await import("@/features/templates/server/template.service");
      const template = await getTemplate(certificate.template_id);
      if (template) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const verifyUrl = `${baseUrl}/verify?number=${certificate.certificate_number}`;
        const qrBuffer = await generateQrCode(verifyUrl, { width: 128, margin: 1 });
        const qrDataUrl = `data:image/png;base64,${qrBuffer.toString("base64")}`;

        let event = null;
        if (certificate.event_id) {
          const { EventRepository } = await import("@/features/events/server/event.repository");
          const eventRepo = new EventRepository(supabaseAdmin);
          event = await eventRepo.findById(certificate.event_id);
        }

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

        console.log(`[download] On-demand rendered PDF from template for ${id}`);
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
