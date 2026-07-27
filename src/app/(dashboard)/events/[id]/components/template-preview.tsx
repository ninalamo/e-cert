"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { CertificateTemplate } from "@/types/template";
import {
  extractCanvasDimensions,
  buildCertificateSrcDoc,
  computeUniformScale,
} from "@/lib/certificate-renderer";

export default function TemplatePreview({
  template,
  eventDate,
  onClose,
}: {
  template: CertificateTemplate;
  eventDate: string | null;
  onClose: () => void;
}) {
  const { width: canvasW, height: canvasH } = useMemo(
    () => extractCanvasDimensions(template.html_content),
    [template.html_content]
  );

  const srcDoc = useMemo(
    () =>
      buildCertificateSrcDoc(
        template.html_content,
        template.css_content ?? "",
        {
          recipient_name: "Juan Dela Cruz",
          certificate_number: "CERT-000001",
          issued_date: eventDate
            ? new Date(eventDate).toLocaleDateString()
            : "",
          organization_name: "Lyceum Of Alabang",
        }
      ),
    [template.html_content, template.css_content, eventDate]
  );

  const [scale, setScale] = useState(1);

  const calcScale = useCallback(() => {
    const maxW = window.innerWidth * 0.9;
    const maxH = window.innerHeight * 0.85;
    setScale(computeUniformScale(canvasW, canvasH, maxW, maxH));
  }, [canvasW, canvasH]);

  useEffect(() => {
    calcScale();
    window.addEventListener("resize", calcScale);
    return () => window.removeEventListener("resize", calcScale);
  }, [calcScale]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/5 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="relative pointer-events-auto">
          <div
            style={{
              width: canvasW,
              height: canvasH,
              transformOrigin: "center center",
              transform: `scale(${scale})`,
            }}
          >
            <iframe
              srcDoc={srcDoc}
              className="w-full h-full bg-white block shadow-2xl border-0"
              title="Template Preview"
              style={{ width: canvasW, height: canvasH }}
            />
          </div>
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
