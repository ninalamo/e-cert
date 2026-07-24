"use client";

import { useState } from "react";
import Link from "next/link";
import { updateEventAction } from "@/features/events/server/event.actions";
import type { Event } from "@/types/event";
import type { CertificateTemplate } from "@/types/template";
import { MailIcon, FileTextIcon } from "lucide-react";

export default function TemplateCard({
  event,
  templates,
  currentTemplate,
  emailTemplates = [],
  currentEmailTemplate = null,
  onUpdated,
  onEmailTemplateUpdated,
}: {
  event: Event;
  templates: CertificateTemplate[];
  currentTemplate: CertificateTemplate | null;
  emailTemplates?: CertificateTemplate[];
  currentEmailTemplate?: CertificateTemplate | null;
  onUpdated: (event: Event, template: CertificateTemplate | null) => void;
  onEmailTemplateUpdated: (event: Event, emailTemplate: CertificateTemplate | null) => void;
}) {
  const [selected, setSelected] = useState(event.template_id ?? "");
  const [selectedEmail, setSelectedEmail] = useState(event.email_template_id ?? "");
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const result = await updateEventAction(event.id, {
      template_id: selected || undefined,
    });
    if (result?.error) {
      setMessage(result.error ?? "Failed to update template");
    } else if (result?.event) {
      const updatedTemplate =
        templates.find((t) => t.id === (selected || undefined)) ?? null;
      onUpdated(result.event, updatedTemplate);
      setMessage("Template updated.");
    }
    setSaving(false);
  }

  async function handleEmailSave() {
    setSavingEmail(true);
    setEmailMessage(null);
    const result = await updateEventAction(event.id, {
      email_template_id: selectedEmail || undefined,
    });
    if (result?.error) {
      setEmailMessage(result.error ?? "Failed to update email template");
    } else if (result?.event) {
      const updatedEmailTemplate =
        emailTemplates.find((t) => t.id === (selectedEmail || undefined)) ?? null;
      onEmailTemplateUpdated(result.event, updatedEmailTemplate);
      setEmailMessage("Email template updated.");
    }
    setSavingEmail(false);
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
          {templates.map((t) => (
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
            className="btn-brand-soft disabled:opacity-50"
          >
            {saving ? "Saving..." : "Assign Template"}
          </button>
          {(selected || event.template_id) && (
            <Link
              href={`/templates/${selected || event.template_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-brand-soft"
            >
              Edit in Page
            </Link>
          )}
          {message && (
            <span className="text-xs text-tertiary">{message}</span>
          )}
        </div>
      </div>

      {/* Email Template */}
      <div className="app-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <MailIcon className="size-4 text-[var(--color-text-muted)]" />
          <p className="section-title mb-0">Email Template</p>
          <span className="rounded-full bg-surface-tertiary px-2.5 py-0.5 text-[11px] font-medium text-tertiary">
            Optional
          </span>
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
            className="btn-brand-soft disabled:opacity-50"
          >
            {savingEmail ? "Saving..." : "Assign Email Template"}
          </button>
          {(selectedEmail || event.email_template_id) && (
            <Link
              href={`/templates/${selectedEmail || event.email_template_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-brand-soft"
            >
              Edit in Page
            </Link>
          )}
          {emailMessage && (
            <span className="text-xs text-tertiary">{emailMessage}</span>
          )}
        </div>
      </div>
    </div>
  );
}
