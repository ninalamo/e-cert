"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getTemplatesAction } from "@/features/templates/server/template.actions";
import { issueCertificateAction } from "../server/certificate.actions";
import type { CertificateTemplate } from "@/types/template";

function IssueFormInner() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!orgId || loaded) return;
    const data = await getTemplatesAction(orgId);
    setTemplates(data);
    setLoaded(true);
  }, [orgId, loaded]);

  if (!loaded) {
    loadTemplates();
  }

  if (!orgId) {
    return <p className="text-muted-foreground">Select an organization first.</p>;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const result = await issueCertificateAction({
      organization_id: orgId!,
      template_id: formData.get("template_id") as string,
      recipient_name: formData.get("recipient_name") as string,
      recipient_email: formData.get("recipient_email") as string,
      expires_at: (formData.get("expires_at") as string) || undefined,
    });

    if (result?.error) {
      setError(result.error);
    } else if (result?.certificate) {
      setSuccess(`Certificate ${result.certificate.certificate_number} issued!`);
      (e.target as HTMLFormElement).reset();
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">{success}</div>
      )}

      <div>
        <label htmlFor="template_id" className="block text-sm font-medium">Template</label>
        <select
          id="template_id"
          name="template_id"
          required
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Select a template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="recipient_name" className="block text-sm font-medium">Recipient Name</label>
          <input
            id="recipient_name"
            name="recipient_name"
            type="text"
            required
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="recipient_email" className="block text-sm font-medium">Recipient Email</label>
          <input
            id="recipient_email"
            name="recipient_email"
            type="email"
            required
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="expires_at" className="block text-sm font-medium">Expiry Date (optional)</label>
        <input
          id="expires_at"
          name="expires_at"
          type="date"
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Issuing..." : "Issue Certificate"}
        </button>
      </div>
    </form>
  );
}

export default function IssueForm() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
      <IssueFormInner />
    </Suspense>
  );
}
