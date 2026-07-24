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

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
    >
      <button
        type="button"
        onClick={() => router.back()}
        className="fixed top-4 right-4 z-[201] flex items-center justify-center w-10 h-10 rounded-full bg-white/90 border border-gray-200 text-gray-500 shadow-lg transition-all hover:bg-white hover:text-gray-700 hover:shadow-xl active:scale-[0.95]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>

      {certHtml ? (
        <div
          className="bg-white shadow-2xl rounded-lg overflow-hidden flex-shrink-0"
          style={{ width: certWidth, height: certHeight, maxWidth: "65vw", maxHeight: "85vh" }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: certHtml }}
            style={{
              width: certWidth,
              height: certHeight,
            }}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 text-center shadow-xl">
          <p className="text-sm text-gray-500">Certificate not available for preview.</p>
        </div>
      )}
    </div>
  );
}
