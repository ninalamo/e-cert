"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { certificatesApi } from "@/lib/api/certificates";
import { templatesApi } from "@/lib/api/templates";
import { eventsApi } from "@/lib/api/events";
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
  const [qrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: cert } = await certificatesApi.get(id);
        if (!cert) return;
        setCertificate(cert);

        if (cert.template_id) {
          const { data: tmpl } = await templatesApi.get(cert.template_id);
          setTemplate(tmpl);
        }
        if (cert.event_id) {
          const { data: ev } = await eventsApi.get(cert.event_id);
          setEvent(ev);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [id]);

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
      orgName={ORG_NAME}
    />
  );
}
