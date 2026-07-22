"use client";

import { useState } from "react";
import Link from "next/link";
import { updateEventAction } from "@/features/events/server/event.actions";
import type { Event } from "@/types/event";
import type { CertificateTemplate } from "@/types/template";

export default function TemplateCard({
  event,
  templates,
  currentTemplate,
  onUpdated,
}: {
  event: Event;
  templates: CertificateTemplate[];
  currentTemplate: CertificateTemplate | null;
  onUpdated: (event: Event, template: CertificateTemplate | null) => void;
}) {
  const [selected, setSelected] = useState(event.template_id ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <div className="app-card p-4">
      <p className="section-title mb-3">Template</p>
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
  );
}
