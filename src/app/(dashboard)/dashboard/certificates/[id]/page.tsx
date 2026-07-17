"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import { getCertificateAction } from "@/features/certificates/server/certificate.actions";
import { getTemplateAction } from "@/features/templates/server/template.actions";
import EmailHistory from "@/features/certificates/components/email-history";
import type { Certificate } from "@/types/certificate";
import type { CertificateTemplate } from "@/types/template";

export default function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cert = await getCertificateAction(id);
      if (cancelled) return;
      if (!cert) {
        setError("Certificate not found");
        setLoading(false);
        return;
      }
      setCertificate(cert);
      if (cert.template_id) {
        const tpl = await getTemplateAction(cert.template_id);
        if (!cancelled) setTemplate(tpl);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }

  if (error || !certificate) {
    return <p className="text-red-600 text-sm">{error || "Not found"}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Certificate {certificate.certificate_number}</h2>
          <p className="text-sm text-muted-foreground">
            {certificate.recipient_name} ({certificate.recipient_email})
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/certificates/${certificate.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Download PDF
          </a>
          <Link
            href="/dashboard/certificates"
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Back to list
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-md border p-4">
          <p className="font-medium text-muted-foreground">Status</p>
          {certificate.revoked_at ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
              Revoked
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              Active
            </span>
          )}
        </div>
        <div className="rounded-md border p-4">
          <p className="font-medium text-muted-foreground">Issued At</p>
          <p>{new Date(certificate.issued_at).toLocaleString()}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="font-medium text-muted-foreground">Source</p>
          <p>{template?.name ?? (certificate.file_path ? "Uploaded PDF" : "Unknown")}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="font-medium text-muted-foreground">Expires</p>
          <p>
            {certificate.expires_at
              ? new Date(certificate.expires_at).toLocaleDateString()
              : "No expiry"}
          </p>
        </div>
      </div>

      {certificate.revoked_at && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Revoked at {new Date(certificate.revoked_at).toLocaleString()}</p>
          {certificate.revoke_reason && (
            <p className="mt-1">Reason: {certificate.revoke_reason}</p>
          )}
        </div>
      )}

      {!certificate.revoked_at && (
        <div className="rounded-md border p-4">
          <EmailHistory certificateId={certificate.id} />
        </div>
      )}
    </div>
  );
}
