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
  const printRef = useRef<HTMLDivElement>(null);

  const meta = (certificate.metadata as Record<string, unknown> | null) ?? {};
  const cachedHtml = typeof meta.rendered_html === "string" ? meta.rendered_html : null;

  const certWidth = template?.template_context?.full_width || (() => {
    const m = template?.html_content.match(/class=\"certificate\"[^>]*width:(\d+)px/);
    return m ? parseInt(m[1], 10) : 1123;
  })();
  const certHeight = template?.template_context?.full_height || (() => {
    const m = template?.html_content.match(/class=\"certificate\"[^>]*height:(\d+)px/);
    return m ? parseInt(m[1], 10) : 794;
  })();

  const certHtml = template
    ? template.html_content
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
    : cachedHtml;

  const certCss = template?.css_content ?? "";

  const certWidth = (() => {
    const m = template?.html_content?.match(/width:\s*(\d+)px/);
    return m ? parseInt(m[1], 10) : 1123;
  })();
  const certHeight = (() => {
    const m = template?.html_content?.match(/height:\s*(\d+)px/);
    return m ? parseInt(m[1], 10) : 794;
  })();

  function handlePrint() {
    if (!certHtml) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const orientation = certWidth >= certHeight ? "landscape" : "portrait";
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${certificate.certificate_number}</title>
  <style>
    @page { size: A4 ${orientation}; margin: 0; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
    ${certCss}
  </style>
</head>
<body>
  ${certHtml}
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  <\/script>
</body>
</html>`);
    printWindow.document.close();
  }

  return (
    <>
      <div className="min-h-screen bg-surface-muted pt-safe pb-safe screen-only">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-primary">Certificate</h1>
              <p className="font-mono text-xs text-tertiary">{certificate.certificate_number}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {certHtml && (
                <button onClick={handlePrint} className="btn-brand">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print
                </button>
              )}
            </div>
          </div>

          {certHtml ? (
            <div
              ref={printRef}
              className="mx-auto block bg-white overflow-hidden"
              style={{ width: "100%", aspectRatio: `${certWidth} / ${certHeight}`, maxWidth: "100%", padding: "1.5rem" }}
            >
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta name="viewport" content="width=${certWidth}"><style>html,body{margin:0;padding:0;width:${certWidth}px;height:${certHeight}px;overflow:auto;}${certCss}</style></head><body>${certHtml}</body></html>`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Certificate"
              />
            </div>
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

      <style>{`
        @media print {
          body > *:not(.print-only) { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>
      <div className="print-only" style={{ display: "none" }}>
        <style>{`
          @page { size: A4 ${certWidth >= certHeight ? "landscape" : "portrait"}; margin: 0; }
          html, body { margin: 0; padding: 0; }
          ${certCss}
        `}</style>
        <div dangerouslySetInnerHTML={{ __html: certHtml ?? "" }} />
      </div>
    </>
  );
}
