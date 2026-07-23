"use client";

import { Fragment, useRef, useState } from "react";
import { toast } from "sonner";
import TemplateCanvas from "./template-canvas";
import type { TemplateCanvasHandle } from "./template-canvas";
import CodeEditor from "@/components/ui/code-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InfoIcon } from "lucide-react";

interface TemplateFormProps {
  initialData?: {
    name: string;
    description: string;
    html_content: string;
    css_content: string;
  };
  onSubmit: (data: {
    name: string;
    description: string;
    html_content: string;
    css_content: string;
  }) => Promise<{ error?: string }>;
  submitLabel: string;
  disabled?: boolean;
}

type Mode = "design" | "preview";

export default function TemplateForm({
  initialData,
  onSubmit,
  submitLabel,
  disabled = false,
}: TemplateFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [htmlContent, setHtmlContent] = useState(initialData?.html_content ?? DEFAULT_HTML);
  const [cssContent, setCssContent] = useState(initialData?.css_content ?? DEFAULT_CSS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("design");
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [sourceTab, setSourceTab] = useState<"html" | "css">("html");
  const canvasRef = useRef<TemplateCanvasHandle>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setShowSaveConfirm(true);
  }

  async function confirmSave() {
    setShowSaveConfirm(false);
    setError(null);
    setLoading(true);

    const html = canvasRef.current?.getHtml() ?? htmlContent;
    const css = canvasRef.current?.getCss() ?? cssContent;

    const result = await onSubmit({
      name,
      description,
      html_content: html,
      css_content: css,
    });

    if (result?.error) {
      setError(result.error);
    } else {
      toast.success("Template saved successfully");
    }
    setLoading(false);
  }

  const certWidth = (() => {
    const m = htmlContent.match(/class="certificate"[^>]*width:(\d+)px/);
    return m ? parseInt(m[1], 10) : 1123;
  })();
  const certHeight = (() => {
    const m = htmlContent.match(/class="certificate"[^>]*height:(\d+)px/);
    return m ? parseInt(m[1], 10) : 794;
  })();

  function handlePrintPreview() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${name || "Certificate"} - Download as PDF</title>
  <style>
    @page { size: ${certWidth}px ${certHeight}px; margin: 0; }
    html, body { margin: 0; padding: 0; width: ${certWidth}px; height: ${certHeight}px; overflow: hidden; }
    ${cssContent}
  </style>
</head>
<body>
  <div style="width: ${certWidth}px; height: ${certHeight}px; overflow: hidden; position: relative;">
    ${htmlContent
      .replace(/\{\{recipient_name\}\}/g, "Juan Dela Cruz")
      .replace(/\{\{certificate_number\}\}/g, "CERT-000001")
      .replace(/\{\{issued_date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{organization_name\}\}/g, "Sample Organization")
    }
  </div>
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

  const previewHtml = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=${certWidth}">
  <style>
    html, body { margin: 0; padding: 0; width: ${certWidth}px; height: ${certHeight}px; overflow: hidden; }
    ${cssContent}
  </style>
</head>
<body>
  ${htmlContent
    .replace(/\{\{recipient_name\}\}/g, "Juan Dela Cruz")
    .replace(/\{\{certificate_number\}\}/g, "CERT-000001")
    .replace(/\{\{issued_date\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{organization_name\}\}/g, "Sample Organization")
    .replace(/\{\{qr_code\}\}/g, '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><g fill="#000"><rect x="5" y="5" width="25" height="25"/><rect x="10" y="10" width="15" height="15" fill="#fff"/><rect x="13" y="13" width="9" height="9"/><rect x="70" y="5" width="25" height="25"/><rect x="75" y="10" width="15" height="15" fill="#fff"/><rect x="78" y="13" width="9" height="9"/><rect x="5" y="70" width="25" height="25"/><rect x="10" y="75" width="15" height="15" fill="#fff"/><rect x="13" y="78" width="9" height="9"/><rect x="35" y="5" width="5" height="5"/><rect x="45" y="5" width="5" height="5"/><rect x="55" y="5" width="5" height="5"/><rect x="35" y="15" width="5" height="5"/><rect x="50" y="15" width="5" height="5"/><rect x="60" y="15" width="5" height="5"/><rect x="35" y="25" width="5" height="5"/><rect x="45" y="25" width="5" height="5"/><rect x="55" y="35" width="5" height="5"/><rect x="40" y="40" width="5" height="5"/><rect x="50" y="40" width="5" height="5"/><rect x="60" y="40" width="5" height="5"/><rect x="35" y="50" width="5" height="5"/><rect x="45" y="50" width="5" height="5"/><rect x="55" y="50" width="5" height="5"/><rect x="5" y="35" width="5" height="5"/><rect x="5" y="45" width="5" height="5"/><rect x="15" y="40" width="5" height="5"/><rect x="25" y="35" width="5" height="5"/><rect x="25" y="45" width="5" height="5"/><rect x="5" y="55" width="5" height="5"/><rect x="15" y="60" width="5" height="5"/><rect x="25" y="55" width="5" height="5"/><rect x="35" y="60" width="5" height="5"/><rect x="45" y="55" width="5" height="5"/><rect x="55" y="55" width="5" height="5"/><rect x="65" y="35" width="5" height="5"/><rect x="75" y="35" width="5" height="5"/><rect x="85" y="35" width="5" height="5"/><rect x="70" y="45" width="5" height="5"/><rect x="80" y="45" width="5" height="5"/><rect x="90" y="45" width="5" height="5"/><rect x="65" y="55" width="5" height="5"/><rect x="75" y="60" width="5" height="5"/><rect x="85" y="55" width="5" height="5"/><rect x="35" y="70" width="5" height="5"/><rect x="45" y="75" width="5" height="5"/><rect x="55" y="70" width="5" height="5"/><rect x="40" y="85" width="5" height="5"/><rect x="50" y="80" width="5" height="5"/><rect x="60" y="85" width="5" height="5"/><rect x="70" y="70" width="5" height="5"/><rect x="80" y="75" width="5" height="5"/><rect x="90" y="80" width="5" height="5"/><rect x="75" y="85" width="5" height="5"/><rect x="85" y="90" width="5" height="5"/></g></svg>')
  }
</body>
</html>`;

  const tabs = [
    { key: "design" as const, label: "Design" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
          {error}
        </div>
      )}

      <fieldset disabled={disabled} className="space-y-5 disabled:opacity-60">
        <div className="tab-bar flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMode(tab.key)}
              className={`tab-item ${mode === tab.key ? "tab-item--active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === "design" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--color-text-muted)]">
                Design your certificate. Use the {"\""}Insert field{"\""} buttons to add
                placeholders that are filled in when a certificate is issued.
              </p>
              <p className="text-xs text-amber-600">
                For best results, use a background image with the same dimensions as the canvas size.
              </p>
              <button
                type="button"
                onClick={() => setShowSource(!showSource)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  showSource
                    ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                }`}
              >
                {showSource ? "Hide Source" : "Show Source"}
              </button>
            </div>
            <div className={showSource ? "flex flex-col lg:flex-row gap-3" : ""}>
              <div className={showSource ? "lg:flex-1 min-w-0" : ""}>
                <TemplateCanvas
                  ref={canvasRef}
                  value={htmlContent}
                  onChange={setHtmlContent}
                  css={cssContent}
                  onCssChange={setCssContent}
                  fullscreen={fullscreen}
                  onFullscreenChange={setFullscreen}
                  submitLabel={submitLabel}
                  loading={loading}
                  disabled={disabled}
                  name={name}
                  description={description}
                  onNameChange={setName}
                  onDescriptionChange={setDescription}
                />
              </div>
              {showSource && (
                <div className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] lg:w-96 lg:flex-shrink-0 flex flex-col">
                  <div className="flex border-b border-[var(--color-border)]">
                    {(["html", "css"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setSourceTab(tab)}
                        className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${
                          sourceTab === tab
                            ? "text-[var(--color-brand-700)] border-b-2 border-[var(--color-brand-600)]"
                            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                        }`}
                      >
                        {tab.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="p-4">
                    {sourceTab === "html" ? (
                      <CodeEditor
                        value={htmlContent}
                        onChange={setHtmlContent}
                        rows={14}
                      />
                    ) : (
                      <CodeEditor
                        value={cssContent}
                        onChange={setCssContent}
                        rows={14}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </fieldset>

      <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Changes?</DialogTitle>
            <DialogDescription>
              Are you sure you want to save these changes?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-3 text-sm">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-info-text)]" />
            <p className="text-[var(--color-info-text)]">
              This will update the template with your changes.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-surface)]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-[var(--color-brand-600)] border-t-transparent" />
            <p className="text-sm font-medium text-[var(--color-text)]">Saving changes...</p>
          </div>
        </div>
      )}
    </form>
  );
}

const DEFAULT_HTML = `<div class="certificate">
  <h1>Certificate of Completion</h1>
  <p>This is to certify that</p>
  <h2>{{recipient_name}}</h2>
  <p>has successfully completed the program</p>
  <p class="cert-number">Certificate No: {{certificate_number}}</p>
  <p class="date">Issued on: {{issued_date}}</p>
</div>`;

const DEFAULT_CSS = `.certificate {
  text-align: center;
  padding: 60px 40px;
  font-family: Georgia, serif;
}
.certificate h1 {
  font-size: 32px;
  margin-bottom: 20px;
}
.certificate h2 {
  font-size: 28px;
  border-bottom: 2px solid #333;
  display: inline-block;
  padding-bottom: 5px;
  margin: 20px 0;
}
.certificate .cert-number {
  font-size: 12px;
  color: #666;
  margin-top: 30px;
}
.certificate .date {
  font-size: 14px;
  color: #666;
}`;
