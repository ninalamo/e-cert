"use client";

import { useState } from "react";
import { ORG_ID } from "@/lib/org";
import { certificatesApi } from "@/lib/api/certificates";
import type { CertificateTemplate } from "@/types/template";

type IssueMode = "template" | "file";

interface IssueFormProps {
  initialTemplates: CertificateTemplate[];
}

export default function IssueForm({ initialTemplates }: IssueFormProps) {
  const [templates] = useState<CertificateTemplate[]>(initialTemplates);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<IssueMode>("template");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const recipientName = formData.get("recipient_name") as string;
    const recipientEmail = formData.get("recipient_email") as string;
    const expiresAt = (formData.get("expires_at") as string) || undefined;
    const sendEmail = formData.get("send_email") === "on";

    let filePath: string | undefined;

    if (mode === "file" && selectedFile) {
      // Upload requires a certificate_number; generate a temp one for upload
      const tempNumber = `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        const uploadResult = await certificatesApi.upload(ORG_ID, tempNumber, selectedFile);
        filePath = uploadResult?.data?.file_path;
      } catch {
        setError("Failed to upload file");
        setLoading(false);
        return;
      }
    }

    const templateId =
      mode === "template" ? (formData.get("template_id") as string) : undefined;

    if (mode === "template" && !templateId) {
      setError("Please select a template");
      setLoading(false);
      return;
    }

    try {
      const result = await certificatesApi.issue({
        organization_id: ORG_ID,
        template_id: templateId,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        expires_at: expiresAt,
        file_path: filePath,
        send_email: sendEmail,
      });

      if (result?.data?.error) {
        setError(result.data.error);
      } else if (result?.data?.certificate) {
        setSuccess(
          `Certificate ${result.data.certificate.certificate_number} issued!`
        );
        (e.target as HTMLFormElement).reset();
        setSelectedFile(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as { error?: string }).error ?? err.message : "Failed to issue certificate";
      setError(msg);
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-text)]">{error}</div>
      )}
      {success && (
        <div className="rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3 text-sm text-[var(--color-success-text)]">{success}</div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("template")}
          className={`btn ${mode === "template" ? "!bg-brand-600 !text-black" : ""}`}
        >
          Use Template
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`btn ${mode === "file" ? "!bg-brand-600 !text-black" : ""}`}
        >
          Upload PDF
        </button>
      </div>

      {mode === "template" && (
        <div>
          <label htmlFor="template_id" className="block text-sm font-medium">
            Template
          </label>
          <select
            id="template_id"
            name="template_id"
            className="input mt-1"
          >
            <option value="">Select a template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === "file" && (
        <div>
          <label htmlFor="file" className="block text-sm font-medium">
            Certificate PDF
          </label>
          <input
            id="file"
            type="file"
            accept=".pdf"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="input mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a pre-made certificate PDF.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="recipient_name" className="block text-sm font-medium">
            Recipient Name *
          </label>
          <input
            id="recipient_name"
            name="recipient_name"
            type="text"
            required
            className="input mt-1"
          />
        </div>
        <div>
          <label htmlFor="recipient_email" className="block text-sm font-medium">
            Recipient Email *
          </label>
          <input
            id="recipient_email"
            name="recipient_email"
            type="email"
            required
            className="input mt-1"
          />
        </div>
      </div>

      <div>
        <label htmlFor="expires_at" className="block text-sm font-medium">
          Expiry Date (optional)
        </label>
        <input
          id="expires_at"
          name="expires_at"
          type="date"
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="send_email"
          name="send_email"
          type="checkbox"
          className="h-4 w-4 rounded border-default"
        />
        <label htmlFor="send_email" className="text-sm font-medium">
          Send certificate email to recipient
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={loading}
          className="btn disabled:opacity-50"
        >
          {loading ? "Issuing..." : "Issue Certificate"}
        </button>
      </div>
    </form>
  );
}
