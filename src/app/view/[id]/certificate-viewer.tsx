"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const meta = (certificate.metadata as Record<string, unknown> | null) ?? {};
  const cachedHtml = typeof meta.rendered_html === "string" ? meta.rendered_html : null;

  const certWidth = (() => {
    const m = template?.html_content?.match(/width:\s*(\d+)px/);
    return m ? parseInt(m[1], 10) : 1123;
  })();
  const certHeight = (() => {
    const m = template?.html_content?.match(/height:\s*(\d+)px/);
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
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
    >
      <div className="fixed top-4 right-4 z-[201] flex items-center gap-2">
        {certHtml && (
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-full bg-white/90 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-lg transition-all hover:bg-white hover:text-gray-800 hover:shadow-xl active:scale-[0.95]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
        )}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/90 border border-gray-200 text-gray-500 shadow-lg transition-all hover:bg-white hover:text-gray-700 hover:shadow-xl active:scale-[0.95]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      {certHtml ? (
        <div
          className="bg-white shadow-2xl rounded-lg overflow-hidden flex-shrink-0 relative"
          style={{ width: certWidth, height: certHeight, maxWidth: "65vw", maxHeight: "85vh" }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: certHtml }}
            style={{
              width: certWidth,
              height: certHeight,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            aria-hidden="true"
          >
            <span
              className="select-none whitespace-nowrap font-bold uppercase tracking-widest text-gray-900/10"
              style={{
                fontSize: Math.min(certWidth, certHeight) * 0.18,
                transform: "rotate(-35deg)",
              }}
            >
              PREVIEW
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 text-center shadow-xl">
          <p className="text-sm text-gray-500">Certificate not available for preview.</p>
        </div>
      )}
    </div>
  );
}
