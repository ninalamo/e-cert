"use client";

import { useEffect, useRef, useState } from "react";
import { XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";

const SAMPLE_DATA: Record<string, string> = {
  recipient_name: "John Doe",
  recipient_email: "john.doe@example.com",
  certificate_name: "Certificate of Completion",
  certificate_number: "CERT-2024-001234",
  issued_date: "January 15, 2024",
  organization_name: "Acme Corporation",
  course_name: "Advanced TypeScript Development",
  instructor_name: "Jane Smith",
  completion_date: "January 10, 2024",
  download_url: "https://example.com/certificate/CERT-2024-001234",
  verification_url: "https://example.com/verify/CERT-2024-001234",
  event_name: "Annual Developer Conference 2024",
  event_date: "March 15-17, 2024",
  event_location: "San Francisco, CA",
};

function replacePlaceholders(html: string): string {
  let result = html;
  for (const [key, value] of Object.entries(SAMPLE_DATA)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

const IFRAME_STYLE = `
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:64px}
  table{max-width:100%}img{max-width:100%;height:auto}
  .email-container{width:100%;background:white;border-radius:10px}
  @media(max-width:720px){.email-container{max-width:100%}}
`;

interface EmailTemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  name: string;
}

export default function EmailTemplatePreviewDialog({
  open,
  onOpenChange,
  html,
  name,
}: EmailTemplatePreviewDialogProps) {
  const processedHtml = replacePlaceholders(html);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(600);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resize = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          const height = doc.documentElement.scrollHeight + 32;
          setIframeHeight(Math.min(height, window.innerHeight - 200));
        }
      } catch {}
    };

    iframe.onload = resize;
    resize();
  }, [processedHtml, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
          <DialogTitle className="text-lg">Preview: {name}</DialogTitle>
          <DialogClose className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
        <div className="bg-gray-50 min-h-0 flex items-center justify-center p-4 lg:p-8">
          <iframe
            ref={iframeRef}
            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${IFRAME_STYLE}</style></head><body><div class="email-container">${processedHtml}</div></body></html>`}
            className="w-full max-w-7xl border-0 bg-white rounded-lg shadow-xl"
            style={{ height: `${iframeHeight}px` }}
            title={`Preview: ${name}`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}