"use client";

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
    try {
      const res = await fetch(`/api/certificates/${certificate.id}/download`);
      if (!res.ok) {
        const contentType = res.headers.get("Content-Type") ?? "";
        if (contentType.includes("application/pdf")) {
          window.location.href = `/api/certificates/${certificate.id}/download`;
        }
        return;
      }
      const contentType = res.headers.get("Content-Type") ?? "";
      if (!contentType.includes("application/pdf")) {
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
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
            {(srcDoc || hasPdf) && (
              <button
                onClick={handleDownloadPdf}
                className="btn-brand"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download PDF
              </button>
            )}
          </div>
        </div>

        {srcDoc ? (
          <iframe
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
