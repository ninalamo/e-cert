"use client";

import { useEffect, useState } from "react";
import { parseAccessToken, getAccessToken } from "@/lib/auth";
import { eventsApi } from "@/lib/api/events";
import { templatesApi } from "@/lib/api/templates";
import type { Event } from "@/types/event";
import type { CertificateTemplate } from "@/types/template";
import dynamic from "next/dynamic";

const UploadCsvForm = dynamic(() => import("./upload-csv-form"));

export default function UploadCsvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = getAccessToken();
  const parsed = token ? parseAccessToken(token) : null;
  const permissions = parsed?.permissions ?? [];
  const isAdmin = permissions.some((p: string) => p.startsWith("admin:"));

  const [id, setId] = useState<string>("");
  const [event, setEvent] = useState<Event | null>(null);
  const [initialTemplate, setInitialTemplate] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    let active = true;

    eventsApi
      .get(id)
      .then(async (result) => {
        if (!active) return;
        const ev = (result as { data?: Event })?.data ?? (result as unknown as Event);
        setEvent(ev);
        if (ev?.template_id && ev?.organization_id) {
          const templates = await templatesApi.list(ev.organization_id);
          const found = (templates.data ?? []).find(
            (t) => t.id === ev.template_id
          );
          if (active) setInitialTemplate(found ?? null);
        }
        if (active) setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [id]);

  if (loading || !id) {
    return <div className="app-card p-12 text-center"><p className="text-sm text-tertiary">Loading...</p></div>;
  }

  return (
    <UploadCsvForm
      eventId={id}
      isAdmin={isAdmin}
      initialEvent={event}
      initialTemplate={initialTemplate}
    />
  );
}
