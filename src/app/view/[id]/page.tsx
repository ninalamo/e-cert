"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { attendeesApi } from "@/lib/api/attendees";
import { ORG_NAME } from "@/lib/org";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let revoked = false;
    async function load() {
      try {
        const res = await fetch(`/api/v1/view/${id}`);
        if (!res.ok || revoked) return;
        const json = await res.json();
        const data = json.data;
        if (!data || revoked) return;

        const cert = data.certificate as Certificate;
        if (!cert || revoked) return;
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

        if (cert.event_id) {
          const { data: attendees } = await attendeesApi.list(cert.event_id);
          if (revoked) return;
          const match = attendees?.find((a) => a.certificate_id === cert.id);
          if (match) {
            const mode = (match.metadata as Record<string, unknown> | null)?.generation_mode;
            if (mode === "file") {
              const blob = await attendeesApi.getFileBlob(match.id);
              if (!revoked && blob instanceof Blob) {
                const url = URL.createObjectURL(blob);
                setFileBlobUrl(url);
                setFileType(blob.type);
              }
            }
          }
        }
      } catch {
        // ignore
      }
      if (!revoked) setLoading(false);
    }
    load();
    return () => { revoked = true; };
  }, [id]);

  useEffect(() => {
    return () => { if (fileBlobUrl) URL.revokeObjectURL(fileBlobUrl); };
  }, [fileBlobUrl]);

  if (loading) return <div className="p-8 text-center text-sm text-tertiary">Loading...</div>;
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
