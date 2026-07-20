"use client";

import { useState } from "react";
import Link from "next/link";
import TemplateCanvas from "./template-canvas";
import CodeEditor from "@/components/ui/code-editor";

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
      setLoading(false);
    }
  }

  const previewHtml = `<!DOCTYPE html>
<html>
<head>
  <style>${cssContent}</style>
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
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold mb-1.5 text-[var(--color-text)]">
              Template Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Certificate of Completion"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-semibold mb-1.5 text-[var(--color-text)]">
              Description
            </label>
            <input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="input"
            />
          </div>
        </div>

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
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
            <iframe
              srcDoc={previewHtml}
              className="w-full bg-white"
              style={{ height: "600px" }}
              title="Template Preview"
            />
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
