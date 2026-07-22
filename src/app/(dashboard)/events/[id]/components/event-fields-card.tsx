"use client";

import { useState } from "react";
import { updateEventAction } from "@/features/events/server/event.actions";
import type { Event } from "@/types/event";

function sanitizePrefix(raw: string): string {
  return raw
    .toUpperCase()
    .split("")
    .filter((ch) => /[A-Z0-9-]/.test(ch))
    .join("");
}

function normalizePrefix(raw: string): string {
  const cleaned = sanitizePrefix(raw);
  if (/^-+$/.test(cleaned)) return "";
  return cleaned;
}

function trimPatternTrailingDash(pattern: string): string {
  const prefix = pattern.replace(/#+$/, "");
  const trimmed = normalizePrefix(prefix);
  if (!trimmed) return pattern;
  const sep = trimmed.endsWith("-") ? "" : "-";
  return `${trimmed}${sep}####`;
}

export { sanitizePrefix, trimPatternTrailingDash };

interface FieldsValue {
  event_date: string;
  description: string;
  organizer: string;
  location: string;
  certificate_title: string;
  certificate_number_pattern: string;
  valid_until: string;
}

function fieldsFromEvent(event: Event): FieldsValue {
  return {
    event_date: event.event_date ?? "",
    description: event.description ?? "",
    organizer: event.organizer ?? "",
    location: event.location ?? "",
    certificate_title: event.certificate_title ?? "",
    certificate_number_pattern: event.certificate_number_pattern ?? "",
    valid_until: event.valid_until ?? "",
  };
}

export default function EventFieldsCard({
  event,
  onUpdated,
}: {
  event: Event;
  onUpdated: (event: Event) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<FieldsValue>(() => fieldsFromEvent(event));

  async function handleSave() {
    setSaving(true);
    const result = await updateEventAction(event.id, {
      event_date: values.event_date || undefined,
      description: values.description || undefined,
      organizer: values.organizer || undefined,
      location: values.location || undefined,
      certificate_title: values.certificate_title || undefined,
      certificate_number_pattern: trimPatternTrailingDash(values.certificate_number_pattern) || undefined,
      valid_until: values.valid_until || undefined,
    });
    if (!result?.error && result?.event) {
      onUpdated(result.event);
    }
    setSaving(false);
    setEditing(false);
  }

  function startEditing() {
    setValues(fieldsFromEvent(event));
    setEditing(true);
  }

  if (event.status === "draft") {
    return (
      <div className="app-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <p className="section-title">Event Details</p>
          {editing ? (
            <div className="flex items-center gap-2 ml-auto">
              <button type="button" onClick={handleSave} className="btn-save" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-cancel">
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              title="Edit event details"
              className="text-xs text-info font-medium cursor-pointer"
            >
              (edit)
            </button>
          )}
        </div>
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-tertiary mb-1">Certificate Title</label>
              <input
                value={values.certificate_title}
                onChange={(e) => setValues((p) => ({ ...p, certificate_title: e.target.value }))}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tertiary mb-1">
                Certificate Number Prefix (optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={values.certificate_number_pattern.replace(/#+$/, "")}
                  onChange={(e) => setValues((p) => ({ ...p, certificate_number_pattern: `${sanitizePrefix(e.target.value)}####` }))}
                  placeholder="CERT-"
                  className="input text-sm"
                />
                <span className="text-sm text-tertiary font-mono">####</span>
              </div>
              <p className="mt-1 text-[11px] text-tertiary">
                A <code>#</code> counter is appended automatically (shared per prefix). Blank = epoch + random fallback.
              </p>
              {values.certificate_number_pattern && (
                <p className="mt-1 text-[11px] text-tertiary">
                  Next certificate will look like:{" "}
                  <code className="rounded bg-surface-tertiary px-1 py-0.5 font-mono">
                    {trimPatternTrailingDash(values.certificate_number_pattern).replace(/#+$/, (m) => m.replace(/#/g, "0"))}
                  </code>
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-tertiary mb-1">Description</label>
              <textarea
                value={values.description}
                onChange={(e) => setValues((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tertiary mb-1">Organizer</label>
              <input
                value={values.organizer}
                onChange={(e) => setValues((p) => ({ ...p, organizer: e.target.value }))}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tertiary mb-1">Location</label>
              <input
                value={values.location}
                onChange={(e) => setValues((p) => ({ ...p, location: e.target.value }))}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tertiary mb-1">Certificate Issue Date</label>
              <input
                type="date"
                value={values.event_date ? values.event_date.slice(0, 10) : ""}
                onChange={(e) => setValues((p) => ({ ...p, event_date: e.target.value }))}
                className="input text-sm"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs text-tertiary">Certificate Expiry Date (Optional)</label>
                {values.valid_until && (
                  <button
                    type="button"
                    onClick={() => setValues((p) => ({ ...p, valid_until: "" }))}
                    className="text-xs font-medium text-tertiary hover:text-[var(--color-danger-text)] cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="date"
                value={values.valid_until ? values.valid_until.slice(0, 10) : ""}
                onChange={(e) => setValues((p) => ({ ...p, valid_until: e.target.value }))}
                className="input text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between px-1 py-2.5">
              <span className="text-sm text-tertiary">Certificate Title</span>
              <span className="text-sm font-medium">{event.certificate_title || "\u2014"}</span>
            </div>
            <div className="flex items-center justify-between px-1 py-2.5">
              <span className="text-sm text-tertiary">Number Pattern</span>
              <span className="text-sm font-medium">{event.certificate_number_pattern || "\u2014"}</span>
            </div>
            {event.description && (
              <div className="flex items-center justify-between px-1 py-2.5">
                <span className="text-sm text-tertiary">Description</span>
                <span className="text-sm font-medium text-right max-w-[60%] truncate">{event.description}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-1 py-2.5">
              <span className="text-sm text-tertiary">Organizer</span>
              <span className="text-sm font-medium">{event.organizer || "\u2014"}</span>
            </div>
            <div className="flex items-center justify-between px-1 py-2.5">
              <span className="text-sm text-tertiary">Location</span>
              <span className="text-sm font-medium">{event.location || "\u2014"}</span>
            </div>
            {event.event_date && (
              <div className="flex items-center justify-between px-1 py-2.5">
                <span className="text-sm text-tertiary">Certificate Issue Date</span>
                <span className="text-sm font-medium">{new Date(event.event_date).toLocaleDateString()}</span>
              </div>
            )}
            {event.valid_until && (
              <div className="flex items-center justify-between px-1 py-2.5">
                <span className="text-sm text-tertiary">Certificate Expiry Date</span>
                <span className="text-sm font-medium">
                  {new Date(event.valid_until).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="app-card divide-y divide-border">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-tertiary">Certificate Title</span>
          <span className="text-sm font-medium">{event.certificate_title || "\u2014"}</span>
        </div>
        {event.description && (
          <div className="px-4 py-3">
            <p className="text-xs text-tertiary mb-1">Description</p>
            <p className="text-sm text-secondary">{event.description}</p>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-tertiary">Organizer</span>
          <span className="text-sm font-medium">{event.organizer || "\u2014"}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-tertiary">Location</span>
          <span className="text-sm font-medium">{event.location || "\u2014"}</span>
        </div>
        {event.event_date && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-tertiary">Certificate Issue Date</span>
            <span className="text-sm font-medium">{new Date(event.event_date).toLocaleDateString()}</span>
          </div>
        )}
        {event.valid_until && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-tertiary">Certificate Expiry Date</span>
            <span className="text-sm font-medium">{new Date(event.valid_until).toLocaleDateString()}</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-tertiary">
        The fields above are mapped (if configured) onto the selected
        certificate template when a certificate is generated.
      </p>
    </>
  );
}
