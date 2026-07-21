"use client";

import { useState } from "react";
import Link from "next/link";
import TemplateCanvas from "./template-canvas";
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

type Mode = "design" | "html" | "css" | "preview";

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
  const [advanced, setAdvanced] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  function toggleAdvanced() {
    setAdvanced((prev) => {
      const next = !prev;
      if (next && mode === "design") {
        setMode("html");
      } else if (!next && (mode === "html" || mode === "css")) {
        setMode("design");
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setShowSaveConfirm(true);
  }

  async function confirmSave() {
    setShowSaveConfirm(false);
    setError(null);
    setLoading(true);

    const result = await onSubmit({
      name,
      description,
      html_content: htmlContent,
      css_content: cssContent,
    });

    if (result?.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  function handlePrintPreview() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${name || "Certificate"} - Print Sample</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
    ${cssContent}
  </style>
</head>
<body>
  ${htmlContent
    .replace(/\{\{recipient_name\}\}/g, "Juan Dela Cruz")
    .replace(/\{\{certificate_number\}\}/g, "CERT-000001")
    .replace(/\{\{issued_date\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{organization_name\}\}/g, "Sample Organization")
  }
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

  const certWidth = (() => {
    const m = htmlContent.match(/class="certificate"[^>]*width:(\d+)px/);
    return m ? parseInt(m[1], 10) : 1123;
  })();
  const certHeight = (() => {
    const m = htmlContent.match(/class="certificate"[^>]*height:(\d+)px/);
    return m ? parseInt(m[1], 10) : 794;
  })();

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
  }
</body>
</html>`;

  const tabs = advanced
    ? [
        { key: "html" as const, label: "HTML" },
        { key: "css" as const, label: "CSS" },
        { key: "preview" as const, label: "Preview" },
      ]
    : [
        { key: "design" as const, label: "Design" },
        { key: "preview" as const, label: "Preview" },
      ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
          {error}
        </div>
      )}

      <fieldset disabled={disabled} className="space-y-5 disabled:opacity-60">
        <div className="flex items-center gap-3">
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
          <button
            type="button"
            onClick={toggleAdvanced}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
              advanced
                ? "bg-[var(--color-brand-100)] text-[var(--color-brand-700)] border-[var(--color-brand-200)]"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border-[var(--color-border)]"
            }`}
          >
            Advanced
          </button>
        </div>

        {mode === "preview" ? (
          <div className="space-y-3">
            <p className="text-xs text-[var(--color-text-muted)]">
              Preview your certificate with sample data. The ruler guides show the actual dimensions.
            </p>
            <div className="cert-canvas overflow-auto rounded-md border bg-[var(--color-surface-secondary)] p-3">
              <div className="inline-block bg-[var(--color-surface)] p-1.5 rounded-lg shadow-sm">
                <div className="relative bg-gray-100" style={{ width: certWidth, height: 20 }}>
                  {Array.from({ length: Math.floor(certWidth / 50) + 1 }, (_, i) => i * 50).map(p => (
                    <>
                      <div key={p} className="absolute bg-gray-400" style={{ left: p, top: 0, width: 1, height: p % 100 === 0 ? 10 : 6 }} />
                      {p % 100 === 0 && p > 0 && (
                        <span key={`l${p}`} className="absolute text-[9px] text-gray-500" style={{ left: p + 2, top: 8 }}>
                          {p}
                        </span>
                      )}
                    </>
                  ))}
                </div>
                <div className="flex">
                  <div className="relative bg-gray-100" style={{ width: 20, height: certHeight }}>
                    {Array.from({ length: Math.floor(certHeight / 50) + 1 }, (_, i) => i * 50).map(p => (
                      <>
                        <div key={p} className="absolute bg-gray-400" style={{ top: p, left: 0, height: 1, width: p % 100 === 0 ? 10 : 6 }} />
                        {p % 100 === 0 && p > 0 && (
                          <span key={`l${p}`} className="absolute text-[9px] text-gray-500" style={{ top: p + 1, left: 10 }}>
                            {p}
                          </span>
                        )}
                      </>
                    ))}
                  </div>
                  <div style={{ width: certWidth, height: certHeight }} className="relative shadow bg-white overflow-hidden">
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-full bg-white block"
                      style={{ border: "none" }}
                      title="Template Preview"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => handlePrintPreview()}
                className="btn-brand-soft text-xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print Sample
              </button>
            </div>
          </div>
        ) : mode === "design" ? (
          <div className="space-y-3">
            <p className="text-xs text-[var(--color-text-muted)]">
              Design your certificate. Use the {"\""}Insert field{"\""} buttons to add
              placeholders that are filled in when a certificate is issued.
            </p>
            <TemplateCanvas
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
        ) : mode === "html" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="html" className="block text-sm font-semibold text-[var(--color-text)]">
                HTML Content
              </label>
              <button
                type="button"
                onClick={() => setHtmlContent(prettifyHtml(htmlContent))}
                className="btn btn-view text-xs px-2.5 py-1.5"
              >
                Prettify
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Use {"{{recipient_name}}"}, {"{{certificate_number}}"}, {"{{issued_date}}"}, {"{{organization_name}}"}, {"{{qr_code}}"} as placeholders
            </p>
            <CodeEditor
              id="html"
              value={htmlContent}
              onChange={setHtmlContent}
              rows={16}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="css" className="block text-sm font-semibold text-[var(--color-text)]">
                CSS Content
              </label>
              <button
                type="button"
                onClick={() => setCssContent(prettifyCss(cssContent))}
                className="btn btn-view text-xs px-2.5 py-1.5"
              >
                Prettify
              </button>
            </div>
            <CodeEditor
              id="css"
              value={cssContent}
              onChange={setCssContent}
              rows={8}
            />
          </div>
        )}
      </fieldset>

      {!fullscreen && (
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/templates"
            className="btn-cancel"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || disabled}
            className="btn-save disabled:opacity-50"
          >
            {loading ? "Saving..." : submitLabel}
          </button>
        </div>
      )}

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

const BG_MARKER = "/* __CERT_BACKGROUND__ */";
const BG_BLOCK_RE = /\/\* __CERT_BACKGROUND__ \*\/[\s\S]*?}/;

function prettifyCss(css: string): string {
  const bgMatch = css.match(BG_BLOCK_RE);
  const stripped = css.replace(BG_BLOCK_RE, "").trim();

  let result = stripped
    .replace(/\s*{\s*/g, " {\n  ")
    .replace(/\s*}\s*/g, "\n}\n")
    .replace(/\s*;\s*/g, ";\n  ")
    .replace(/;\n\s*}/g, ";\n}")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  let indent = 0;
  const lines = result.split("\n");
  const formatted: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === "}") {
      indent = Math.max(0, indent - 1);
      formatted.push("  ".repeat(indent) + trimmed);
    } else if (trimmed.endsWith("{")) {
      formatted.push("  ".repeat(indent) + trimmed);
      indent++;
    } else {
      formatted.push("  ".repeat(indent) + trimmed);
    }
  }

  let output = formatted.join("\n") + "\n";
  if (bgMatch) {
    output = output.trimEnd() + "\n\n" + bgMatch[0] + "\n";
  }
  return output;
}

function prettifyHtml(html: string): string {
  const SELF_CLOSING = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
  ]);
  const BLOCK = new Set([
    "div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
    "table", "thead", "tbody", "tfoot", "tr", "td", "th", "section",
    "article", "nav", "header", "footer", "main", "aside", "form",
    "fieldset", "legend", "figure", "figcaption", "blockquote", "pre",
    "address", "dl", "dt", "dd", "details", "summary", "dialog",
  ]);

  let result = "";
  let indent = 0;
  let i = 0;
  const s = html;

  while (i < s.length) {
    if (s[i] === "<") {
      const closeIdx = s.indexOf(">", i);
      if (closeIdx === -1) {
        result += s.slice(i);
        break;
      }

      const tag = s.slice(i, closeIdx + 1);
      const isClosing = tag.startsWith("</");
      const isSelfClose = tag.endsWith("/>");
      const tagMatch = tag.match(/<\/?([a-zA-Z][a-zA-Z0-9]*)/);
      const tagName = tagMatch ? tagMatch[1].toLowerCase() : "";
      const isBlock = BLOCK.has(tagName);
      const isSelfClosingTag = SELF_CLOSING.has(tagName);

      if (isClosing) {
        indent = Math.max(0, indent - 1);
        if (isBlock) {
          result += "\n" + "  ".repeat(indent) + tag;
        } else {
          result += tag;
        }
      } else if (isSelfClose || isSelfClosingTag) {
        if (isBlock) {
          result += "\n" + "  ".repeat(indent) + tag;
        } else {
          result += tag;
        }
      } else {
        if (isBlock) {
          result += "\n" + "  ".repeat(indent) + tag;
        } else {
          result += tag;
        }
        indent++;
      }

      i = closeIdx + 1;
    } else {
      const nextTag = s.indexOf("<", i);
      const text = nextTag === -1 ? s.slice(i) : s.slice(i, nextTag);
      const trimmed = text.trim();
      if (trimmed) {
        result += trimmed;
      }
      i = nextTag === -1 ? s.length : nextTag;
    }
  }

  return result.replace(/^\n+/, "").trim() + "\n";
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
