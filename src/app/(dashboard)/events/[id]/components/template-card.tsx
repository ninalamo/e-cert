"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { eventsApi } from "@/lib/api/events";
import type { Event } from "@/types/event";
import type { CertificateTemplate } from "@/types/template";
import { FileTextIcon } from "lucide-react";

interface TemplateCardProps {
  event: Event;
  templates: CertificateTemplate[];
  currentTemplate: CertificateTemplate | null;
  emailTemplates?: CertificateTemplate[];
  currentEmailTemplate?: CertificateTemplate | null;
  onUpdated: (event: Event, template: CertificateTemplate | null) => void;
  onEmailTemplateUpdated: (event: Event, emailTemplate: CertificateTemplate | null) => void;
}

export default function TemplateCard({
  event,
  templates,
  currentTemplate,
  onUpdated,
}: TemplateCardProps) {
  const [selected, setSelected] = useState(event.template_id ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const displayTemplates = useMemo(() => {
    if (currentTemplate && !templates.some((t) => t.id === currentTemplate.id)) {
      return [currentTemplate, ...templates];
    }
    return templates;
  }, [templates, currentTemplate]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const { data: result } = await eventsApi.update(event.id, {
      template_id: selected || undefined,
    });
    if (!result) {
      setMessage("Failed to update template");
    } else {
      const updatedTemplate =
        displayTemplates.find((t) => t.id === (selected || undefined)) ?? null;
      onUpdated(result, updatedTemplate);
      setMessage("Template updated.");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Certificate Template */}
      <div className="app-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <FileTextIcon className="size-4 text-[var(--color-text-muted)]" />
          <p className="section-title mb-0">Certificate Template</p>
        </div>
        <div className="mb-2 text-sm">
          <span className="text-tertiary">Current: </span>
          <span className="font-medium">{currentTemplate?.name ?? "No template"}</span>
          {event.status !== "draft" && (
            <span
              title="Locked: this template cannot be edited while the event is active or archived"
              className="status-badge status-badge--archive ml-2"
            >
              Locked
            </span>
          )}
        </div>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={event.status !== "draft"}
          className="input mb-3 disabled:opacity-50"
        >
          <option value="">No template</option>
          {displayTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={
              saving ||
              selected === (event.template_id ?? "") ||
              event.status !== "draft"
            }
            className="btn disabled:opacity-50"
          >
            {saving ? "Saving..." : "Assign Template"}
          </button>
          {(selected || event.template_id) && (
            <Link
              href={`/templates/certificates/${selected || event.template_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              Edit in Page
            </Link>
          )}
          {message && (
            <span className="text-xs text-tertiary">{message}</span>
          )}
        </div>
      </div>

      {/* HIDDEN: Email template selector — always uses the system default email template.
          The underlying state (selectedEmail) remains initialized from event.email_template_id
          but the UI is hidden so users cannot change it. To re-enable, uncomment the block below. */}
      {/* <div className="app-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <MailIcon className="size-4 text-[var(--color-text-muted)]" />
          <p className="section-title mb-0">Email Template</p>
        </div>
        <div className="mb-2 text-sm">
          <span className="text-tertiary">Current: </span>
          <span className="font-medium">{currentEmailTemplate?.name ?? "System default"}</span>
          {event.status !== "draft" && (
            <span
              title="Locked: this template cannot be edited while the event is active or archived"
              className="status-badge status-badge--archive ml-2"
            >
              Locked
            </span>
          )}
        </div>
        <select
          value={selectedEmail}
          onChange={(e) => setSelectedEmail(e.target.value)}
          disabled={event.status !== "draft"}
          className="input mb-3 disabled:opacity-50"
        >
          <option value="">System default template</option>
          {emailTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleEmailSave}
            disabled={
              savingEmail ||
              selectedEmail === (event.email_template_id ?? "") ||
              event.status !== "draft"
            }
            className="btn disabled:opacity-50"
          >
            {savingEmail ? "Saving..." : "Assign Email Template"}
          </button>
          {(selectedEmail || event.email_template_id) && (
            <Link
              href={`/templates/emails/${selectedEmail || event.email_template_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              Edit in Page
            </Link>
          )}
          {emailMessage && (
            <span className="text-xs text-tertiary">{emailMessage}</span>
          )}
        </div>
      </div> */}
    </div>
  );
}