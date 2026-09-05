"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { certificatesApi } from "@/lib/api/certificates";
import { eventsApi } from "@/lib/api/events";
import { verifyApi } from "@/lib/api/verify";
import { canManageCertificates, getCurrentSession, DEFAULT_ROLE } from "@/lib/permissions";
import CertificateDetail from "@/features/certificates/components/certificate-detail";
import { SkeletonDetail } from "@/components/ui/skeleton";
import { NotFoundState } from "@/components/not-found-state";
import type { Certificate } from "@/types/certificate";
import type { Event } from "@/types/event";

export default function CertificateDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const eventId = searchParams.get("eventId");

  const session = getCurrentSession();
  const isAdmin = canManageCertificates(session?.role ?? DEFAULT_ROLE);

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: cert } = await certificatesApi.get(id);
        if (!cert) return;
        setCertificate(cert);

        const eventToShow = eventId || cert.event_id;
        if (eventToShow) {
          const { data: ev } = await eventsApi.get(eventToShow);
          setEvent(ev);
        }

        const { data: qr } = await verifyApi.view(id);
        if (qr?.qr_data_url) setQrDataUrl(qr.qr_data_url);
        else {
          const { data: qrCode } = await certificatesApi.getQrCode(cert.certificate_number);
          if (qrCode?.data_url) setQrDataUrl(qrCode.data_url);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [id, eventId]);

  if (loading) return <SkeletonDetail />;
  if (!certificate)
    return (
      <NotFoundState
        title="Certificate not found"
        description="It may have been deleted or revoked."
        backHref="/certificates"
        backLabel="Back to Certificates"
      />
    );

  return (
    <CertificateDetail
      certificate={certificate}
      event={event}
      qrDataUrl={qrDataUrl}
      isAdmin={isAdmin}
      eventIdParam={eventId ?? null}
    />
  );
}
