"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EmailTemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  name: string;
}

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

export default function EmailTemplatePreviewDialog({
  open,
  onOpenChange,
  html,
  name,
}: EmailTemplatePreviewDialogProps) {
  const processedHtml = replacePlaceholders(html);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-lg">Preview: {name}</DialogTitle>
        </DialogHeader>
        <div className="h-[calc(90vh-140px)] overflow-auto">
          <iframe
            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;}table{max-width:100%;}img{max-width:100%;height:auto;}</style></head><body>${processedHtml}</body></html>`}
            className="w-full h-full border-0 bg-white"
            title={`Preview: ${name}`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}