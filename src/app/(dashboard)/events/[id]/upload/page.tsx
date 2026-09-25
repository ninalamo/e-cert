"use client";

import { useEffect, useState } from "react";
import { parseAccessToken, getAccessToken } from "@/lib/auth";
import { getCurrentGroups } from "@/lib/permissions";
import { hasDashboardAccess } from "@/lib/roles";
import { NotFoundState } from "@/components/not-found-state";
import { eventsApi } from "@/lib/api/events";
import type { Event } from "@/types/event";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    let active = true;

    eventsApi
      .get(id)
      .then((result) => {
        if (!active) return;
        setEvent(result.data ?? null);
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

  if (!hasDashboardAccess(getCurrentGroups())) {
    return (
      <NotFoundState
        title="Insufficient access"
        description="Your account does not have permission to manage events."
        backHref="/my"
        backLabel="Back to My Certificates"
      />
    );
  }

  return (
    <UploadCsvForm
      eventId={id}
      isAdmin={isAdmin}
      initialEvent={event}
    />
  );
}
