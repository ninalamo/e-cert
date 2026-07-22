import type { CertificateTemplate } from "@/types/template";

export default function TemplatePreview({
  template,
  eventDate,
  onClose,
}: {
  template: CertificateTemplate;
  eventDate: string | null;
  onClose: () => void;
}) {
  const srcDoc = `<!DOCTYPE html><html><head><meta name="viewport" content="width=960"><style>body{margin:0;overflow:hidden;}${template.css_content ?? ""}</style></head><body>${template.html_content.replace(/\{\{recipient_name\}\}/g, "Juan Dela Cruz").replace(/\{\{certificate_number\}\}/g, "CERT-000001").replace(/\{\{issued_date\}\}/g, new Date(eventDate ?? "").toLocaleDateString()).replace(/\{\{organization_name\}\}/g, "Lyceum Of Alabang")}</body></html>`;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/5 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="relative pointer-events-auto" style={{ height: "85vh", aspectRatio: "297 / 210", maxWidth: "90vw" }}>
          <iframe
            srcDoc={srcDoc}
            className="w-full h-full bg-white block shadow-2xl"
            title="Template Preview"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/80 text-black rounded-full w-8 h-8 flex items-center justify-center shadow-lg backdrop-blur-md border border-black/5 hover:bg-white/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      </div>
    </>
  );
}
