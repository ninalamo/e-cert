"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { certificatesApi } from "@/lib/api/certificates";
import { eventsApi } from "@/lib/api/events";
import CertificateDetail from "@/features/certificates/components/certificate-detail";
import { SkeletonDetail } from "@/components/ui/skeleton";
import { NotFoundState } from "@/components/not-found-state";
import type { Certificate } from "@/types/certificate";
import type { Event } from "@/types/event";

export default function MyCertificateDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [qrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: cert } = await certificatesApi.getMyById(id);
        if (!cert) return;
        setCertificate(cert);

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

  if (loading) return <SkeletonDetail />;
  if (!certificate)
    return (
      <NotFoundState
        title="Certificate not found"
        backHref="/my/certificates"
        backLabel="Back to My Certificates"
      />
    );

  return (
    <CertificateDetail
      certificate={certificate}
      event={event}
      qrDataUrl={qrDataUrl}
      isAdmin={false}
      eventIdParam={null}
    />
  );
}
