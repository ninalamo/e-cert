"use client";

import { useEffect, useState } from "react";
import { templatesApi } from "@/lib/api/templates";
import { ORG_ID } from "@/lib/org";
import type { CertificateTemplate } from "@/types/template";
import NewEventForm from "./new-event-form";

export default function NewEventPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      templatesApi.listCertificateWithLock(ORG_ID),
      templatesApi.listEmailWithLock(ORG_ID),
    ])
      .then(([certRes, emailRes]) => {
        if (!active) return;
        setTemplates((certRes.data ?? []).filter((t) => !t.is_locked));
        setEmailTemplates((emailRes.data ?? []).filter((t) => !t.is_locked));
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="app-card p-12 text-center"><p className="text-sm text-tertiary">Loading templates...</p></div>;
  }

  return (
    <NewEventForm
      templates={templates}
      emailTemplates={emailTemplates}
    />
  );
}
