"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";
import { ORG_NAME } from "@/lib/org";
import { getCurrentGroups } from "@/lib/permissions";
import { hasDashboardAccess } from "@/lib/roles";
import CertificateViewer from "./certificate-viewer";
import { NotFoundState } from "@/components/not-found-state";
import type { Certificate } from "@/types/certificate";
import type { CertificateTemplate } from "@/types/template";
import type { Event } from "@/types/event";

export default function CertificateViewPage() {
  const params = useParams();
  const id = params.id as string;

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [isRevoked, setIsRevoked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/v1/view/${id}`);
        if (cancelled) return;
        // Backend distinguishes revoked (410) from missing (404); the UI
        // must too — a revoked cert is not a "not found".
        if (res.status === 410) {
          setIsRevoked(true);
          setLoading(false);
          return;
        }
        if (!res.ok) return;
        const json = await res.json();
        const data = json.data;
        if (!data || cancelled) return;

        const cert = data.certificate as Certificate;
        if (!cert || cancelled) return;
        setCertificate(cert);

        if (data.template) {
          setTemplate(data.template as CertificateTemplate);
        }
        if (data.event) {
          setEvent(data.event as Event);
        }
        if (data.qr_data_url) {
          setQrDataUrl(data.qr_data_url);
        }

        if (data.generation_mode === "file") {
          try {
            const resPdf = await fetch(`/api/v1/public/certificates/${cert.id}/download`);
            if (!cancelled && resPdf.ok) {
              const blob = await resPdf.blob();
              if (!cancelled && blob instanceof Blob && blob.size > 0) {
                const url = URL.createObjectURL(blob);
                setFileBlobUrl(url);
                setFileType(blob.type || "application/pdf");
              }
            }
          } catch {
            // Fall back to template render when upload bytes unavailable
          }
        }
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    return () => { if (fileBlobUrl) URL.revokeObjectURL(fileBlobUrl); };
  }, [fileBlobUrl]);

  if (loading) return <div className="p-8 text-center text-sm text-tertiary">Loading...</div>;
  if (isRevoked) {
    const groups = getCurrentGroups();
    const back = hasDashboardAccess(groups)
      ? { href: "/certificates", label: "Back to Certificates" }
      : groups.length > 0
        ? { href: "/my/certificates", label: "Back to My Certificates" }
        : { href: "/verify", label: "Verify another certificate" };
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-muted p-4 light-overflow">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mb-6">
            <TriangleAlertIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            This certificate has been revoked.
          </h1>
          <p className="mt-3 text-sm text-tertiary">
            This certificate is no longer valid.
          </p>
          <Link
            href={back.href}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand/90 active:scale-[0.97]"
          >
            {back.label}
          </Link>
        </div>
      </div>
    );
  }
  if (!certificate)
    return (
      <NotFoundState
        title="Certificate not found"
        description="Check the link or certificate number."
      />
    );

  return (
    <CertificateViewer
      certificate={certificate}
      template={template}
      event={event}
      qrDataUrl={qrDataUrl ?? ""}
      orgName={event?.organizer ?? ORG_NAME}
      fileBlobUrl={fileBlobUrl}
      fileType={fileType}
    />
  );
}
