"use client";

import { useRef } from "react";
import type { Certificate } from "@/types/certificate";
import type { Event } from "@/types/event";
import type { CertificateTemplate } from "@/types/template";

interface Props {
  certificate: Certificate;
  template: CertificateTemplate | null;
  event: Event | null;
  qrDataUrl: string;
  orgName: string;
}

export default function CertificateViewer({
  certificate,
  template,
  event,
  qrDataUrl,
  orgName,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const hasPdf = typeof (certificate.metadata as Record<string, unknown> | null)?.rendered_pdf === "string";

  const srcDoc = template
    ? `<!DOCTYPE html><html><head><meta name="viewport" content="width=960"><style>body{margin:0;overflow:hidden;}${template.css_content ?? ""}</style></head><body>${template.html_content
        .replace(/\{\{recipient_name\}\}/g, certificate.recipient_name)
        .replace(/\{\{certificate_number\}\}/g, certificate.certificate_number)
        .replace(/\{\{issued_date\}\}/g, new Date(certificate.issued_at).toLocaleDateString())
        .replace(/\{\{organization_name\}\}/g, orgName)
        .replace(/\{\{event_name\}\}/g, event?.name ?? "")
        .replace(/\{\{event_date\}\}/g, event?.event_date ? new Date(event.event_date).toLocaleDateString() : "")
        .replace(/\{\{event_location\}\}/g, event?.location ?? "")
        .replace(/\{\{event_organizer\}\}/g, event?.organizer ?? "")
        .replace(/\{\{certificate_title\}\}/g, event?.certificate_title ?? "")
        .replace(/\{\{expiry_date\}\}/g, certificate.expires_at ? new Date(certificate.expires_at).toLocaleDateString() : "")
        .replace(/\{\{qr_code\}\}/g, `<img src="${qrDataUrl}" width="128" height="128" />`)
    }</body></html>`
    : null;

  const pdfDataUrl = hasPdf
    ? `data:application/pdf;base64,${(certificate.metadata as Record<string, unknown>).rendered_pdf}`
    : null;

  async function handleDownloadPdf() {
    if (!srcDoc) return;
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const iframe = iframeRef.current;
      if (!iframe?.contentDocument?.body) return;

      const pdfBlob = await html2pdf()
        .set({
          margin: 0,
          filename: `${certificate.certificate_number}.pdf`,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4" as const, orientation: "landscape" as const },
        })
        .from(iframe.contentDocument.body)
        .outputPdf("blob");

      const pdfBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
        reader.readAsDataURL(pdfBlob);
      });

      fetch(`/api/certificates/${certificate.id}/save-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_base64: pdfBase64 }),
      }).catch(() => {});

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${certificate.certificate_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  }

  return (
    <div className="min-h-screen bg-surface-muted pt-safe pb-safe">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-primary">Certificate</h1>
            <p className="font-mono text-xs text-tertiary">{certificate.certificate_number}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {srcDoc && (
              <button
                onClick={handleDownloadPdf}
                className="btn-brand"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download PDF
              </button>
            )}
            {hasPdf && !srcDoc && (
              <a
                href={`/api/certificates/${certificate.id}/download`}
                className="btn-brand"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download PDF
              </a>
            )}
          </div>
        </div>

        {srcDoc ? (
          <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            className="app-card mx-auto block bg-white"
            style={{ width: "100%", height: "80vh", aspectRatio: "297 / 210", maxWidth: "100%" }}
            title="Certificate"
          />
        ) : pdfDataUrl ? (
          <iframe
            src={pdfDataUrl}
            className="app-card mx-auto block bg-white"
            style={{ width: "100%", height: "80vh", aspectRatio: "297 / 210", maxWidth: "100%" }}
            title="Certificate"
          />
        ) : (
          <div className="app-card p-8 text-center">
            <p className="text-sm text-tertiary">Certificate not available for preview.</p>
          </div>
        )}

        <div className="mt-4 text-center">
          <a
            href={`/verify?number=${encodeURIComponent(certificate.certificate_number)}`}
            className="text-xs text-tertiary hover:text-secondary"
          >
            Verify this certificate
          </a>
        </div>
      </div>
    </div>
  );
}
