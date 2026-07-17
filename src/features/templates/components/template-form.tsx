"use client";

import { useState } from "react";
import Link from "next/link";
import TemplateCanvas from "./template-canvas";

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
}

export default function TemplateForm({
  initialData,
  onSubmit,
  submitLabel,
}: TemplateFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [htmlContent, setHtmlContent] = useState(initialData?.html_content ?? DEFAULT_HTML);
  const [cssContent, setCssContent] = useState(initialData?.css_content ?? DEFAULT_CSS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"design" | "html" | "css" | "preview">("design");

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Template Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Certificate of Completion"
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        {(["design", "html", "css", "preview"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1 capitalize text-sm ${
              mode === m ? "bg-black text-white" : "bg-gray-100"
            }`}
          >
            {m === "design" ? "Design" : m === "html" ? "HTML" : m === "css" ? "CSS" : "Preview"}
          </button>
        ))}
      </div>

      {mode === "preview" ? (
        <div className="border rounded-md overflow-hidden">
          <iframe
            srcDoc={previewHtml}
            className="w-full h-[600px] bg-white"
            title="Template Preview"
          />
        </div>
      ) : mode === "design" ? (
        <div>
          <p className="text-muted-foreground text-xs mb-2">
            Design your certificate. Use the &quot;Insert field&quot; buttons to add
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
        <div>
          <label htmlFor="html" className="block text-sm font-medium">
            HTML Content
          </label>
          <p className="text-muted-foreground text-xs mb-1">
            Use {"{{recipient_name}}"}, {"{{certificate_number}}"}, {"{{issued_date}}"}, {"{{organization_name}}"}, {"{{qr_code}}"} as placeholders
          </p>
          <textarea
            id="html"
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            rows={16}
            className="mt-1 block w-full rounded-md border px-3 py-2 font-mono text-sm"
          />
        </div>
      ) : (
        <div>
          <label htmlFor="css" className="block text-sm font-medium">
            CSS Content
          </label>
          <textarea
            id="css"
            value={cssContent}
            onChange={(e) => setCssContent(e.target.value)}
            rows={8}
            className="mt-1 block w-full rounded-md border px-3 py-2 font-mono text-sm"
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Link
          href="/dashboard/templates"
          className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Cancel
        </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-brand disabled:opacity-50"
          >
            {loading ? "Saving..." : submitLabel}
          </button>
      </div>
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
