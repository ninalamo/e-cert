"use client";

import { useState, useMemo } from "react";
import { ORG_ID } from "@/lib/org";
import { createEventAction, cloneTemplateForEventAction } from "@/features/events/server/event.actions";
import type { CertificateTemplate } from "@/types/template";
import Link from "next/link";

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

function buildPattern(prefix: string): string {
  const trimmed = normalizePrefix(prefix);
  if (!trimmed) return "CERT-####";
  const sep = trimmed.endsWith("-") ? "" : "-";
  return `${trimmed}${sep}####`;
}

export default function NewEventForm({ templates }: { templates: CertificateTemplate[] }) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [cloneTemplate, setCloneTemplate] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [certTitle, setCertTitle] = useState("Certificate of Participation");
  const [certNumberPrefix, setCertNumberPrefix] = useState("CERT-");
  const [validUntil, setValidUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const previewTemplate = useMemo(() => {
    if (!selectedTemplate) return null;
    return templates.find((t) => t.id === selectedTemplate) ?? null;
  }, [selectedTemplate, templates]);

  const certPattern = buildPattern(certNumberPrefix.trim());
  const sampleNumber = certPattern.replace(/#+$/, (m) => m.replace(/#/g, "0"));

  const certWidth = useMemo(() => {
    if (!previewTemplate) return 1123;
    const m = previewTemplate.html_content.match(/class="certificate"[^>]*width:(\d+)px/);
    return m ? parseInt(m[1], 10) : 1123;
  }, [previewTemplate]);

  const certHeight = useMemo(() => {
    if (!previewTemplate) return 794;
    const m = previewTemplate.html_content.match(/class="certificate"[^>]*height:(\d+)px/);
    return m ? parseInt(m[1], 10) : 794;
  }, [previewTemplate]);

  const previewSrcDoc = useMemo(() => {
    if (!previewTemplate) return "";
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=${certWidth}"><style>html,body{margin:0;padding:0;width:${certWidth}px;height:${certHeight}px;overflow:hidden;}${previewTemplate.css_content ?? ""}</style></head><body>${previewTemplate.html_content
      .replace(/\{\{recipient_name\}\}/g, "Juan Dela Cruz")
      .replace(/\{\{certificate_number\}\}/g, sampleNumber)
      .replace(/\{\{issued_date\}\}/g, eventDate ? new Date(eventDate).toLocaleDateString() : "—")
      .replace(/\{\{organization_name\}\}/g, "Lyceum Of Alabang")
      .replace(/\{\{event_name\}\}/g, name || "Sample Event")
      .replace(/\{\{event_date\}\}/g, eventDate ? new Date(eventDate).toLocaleDateString() : "—")
      .replace(/\{\{event_location\}\}/g, location || "—")
      .replace(/\{\{event_organizer\}\}/g, organizer || "—")
      .replace(/\{\{certificate_title\}\}/g, certTitle || "Certificate of Participation")
      .replace(/\{\{expiry_date\}\}/g, validUntil ? new Date(validUntil).toLocaleDateString() : "—")
      .replace(/\{\{qr_code\}\}/g, '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><g fill="#000"><rect x="5" y="5" width="25" height="25"/><rect x="10" y="10" width="15" height="15" fill="#fff"/><rect x="13" y="13" width="9" height="9"/><rect x="70" y="5" width="25" height="25"/><rect x="75" y="10" width="15" height="15" fill="#fff"/><rect x="78" y="13" width="9" height="9"/><rect x="5" y="70" width="25" height="25"/><rect x="10" y="75" width="15" height="15" fill="#fff"/><rect x="13" y="78" width="9" height="9"/><rect x="35" y="5" width="5" height="5"/><rect x="45" y="5" width="5" height="5"/><rect x="55" y="5" width="5" height="5"/><rect x="35" y="15" width="5" height="5"/><rect x="50" y="15" width="5" height="5"/><rect x="60" y="15" width="5" height="5"/><rect x="35" y="25" width="5" height="5"/><rect x="45" y="25" width="5" height="5"/><rect x="55" y="35" width="5" height="5"/><rect x="40" y="40" width="5" height="5"/><rect x="50" y="40" width="5" height="5"/><rect x="60" y="40" width="5" height="5"/><rect x="35" y="50" width="5" height="5"/><rect x="45" y="50" width="5" height="5"/><rect x="55" y="50" width="5" height="5"/><rect x="5" y="35" width="5" height="5"/><rect x="5" y="45" width="5" height="5"/><rect x="15" y="40" width="5" height="5"/><rect x="25" y="35" width="5" height="5"/><rect x="25" y="45" width="5" height="5"/><rect x="5" y="55" width="5" height="5"/><rect x="15" y="60" width="5" height="5"/><rect x="25" y="55" width="5" height="5"/><rect x="35" y="60" width="5" height="5"/><rect x="45" y="55" width="5" height="5"/><rect x="55" y="55" width="5" height="5"/><rect x="65" y="35" width="5" height="5"/><rect x="75" y="35" width="5" height="5"/><rect x="85" y="35" width="5" height="5"/><rect x="70" y="45" width="5" height="5"/><rect x="80" y="45" width="5" height="5"/><rect x="90" y="45" width="5" height="5"/><rect x="65" y="55" width="5" height="5"/><rect x="75" y="60" width="5" height="5"/><rect x="85" y="55" width="5" height="5"/><rect x="35" y="70" width="5" height="5"/><rect x="45" y="75" width="5" height="5"/><rect x="55" y="70" width="5" height="5"/><rect x="40" y="85" width="5" height="5"/><rect x="50" y="80" width="5" height="5"/><rect x="60" y="85" width="5" height="5"/><rect x="70" y="70" width="5" height="5"/><rect x="80" y="75" width="5" height="5"/><rect x="90" y="80" width="5" height="5"/><rect x="75" y="85" width="5" height="5"/><rect x="85" y="90" width="5" height="5"/></g></svg>')}</body></html>`;
  }, [previewTemplate, eventDate, name, location, organizer, certTitle, validUntil, sampleNumber, certWidth, certHeight]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!certNumberPrefix.trim()) {
      setError("Certificate Number Prefix is required.");
      return;
    }

    setLoading(true);

    const result = await createEventAction({
      organization_id: ORG_ID,
      name,
      description: description || undefined,
      event_date: eventDate || undefined,
      location: location || undefined,
      organizer: organizer || undefined,
      certificate_title: certTitle || undefined,
      certificate_number_pattern: certPattern,
      valid_until: validUntil || undefined,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result?.event && selectedTemplate && cloneTemplate) {
      const cloneResult = await cloneTemplateForEventAction(
        selectedTemplate,
        result.event.id,
        name
      );
      if (cloneResult?.error) {
        setError(`Event created but template clone failed: ${cloneResult.error}`);
        setLoading(false);
        return;
      }
    } else if (result?.event && selectedTemplate && !cloneTemplate) {
      const { updateEventAction } = await import("@/features/events/server/event.actions");
      await updateEventAction(result.event.id, { template_id: selectedTemplate });
    }

    window.location.href = "/events";
  }

  return (
    <div className="w-full space-y-5 px-4 pb-12 sm:px-6">
      <div>
        <h1 className="font-heading text-[28px] font-bold tracking-tight text-[var(--color-text)]">
          New Event
        </h1>
        <p className="mt-1 text-[15px] text-tertiary">
          Create a new event. It will be saved as a <span className="font-semibold text-secondary">Draft</span> until you activate it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-4 py-3 text-[14px] shadow-[var(--shadow-ios-sm)]">
            <p className="text-[var(--color-danger-text)]">{error}</p>
          </div>
        )}

        <div className="app-card space-y-4 rounded-2xl p-5 shadow-[var(--shadow-ios)]">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-[13px] font-semibold text-tertiary">
              Event Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Graduation Ceremony 2026"
              className="input h-11 rounded-xl text-[15px]"
            />
          </div>
          <div>
            <label htmlFor="description" className="mb-1.5 block text-[13px] font-semibold text-tertiary">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description of the event"
              className="input rounded-xl text-[15px]"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="location" className="mb-1.5 block text-[13px] font-semibold text-tertiary">
                Location
              </label>
              <input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. School Auditorium"
                className="input h-11 rounded-xl text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="organizer" className="mb-1.5 block text-[13px] font-semibold text-tertiary">
                Organizer
              </label>
              <input
                id="organizer"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                placeholder="e.g. Office of the Registrar"
                className="input h-11 rounded-xl text-[15px]"
              />
            </div>
          </div>
        </div>

        <div className="app-card space-y-4 rounded-2xl p-5 shadow-[var(--shadow-ios)]">
          <div className="flex items-baseline justify-between">
            <p className="section-title mb-0">Certificate Settings</p>
            <span className="rounded-full bg-surface-tertiary px-2.5 py-0.5 text-[11px] font-medium text-tertiary">
              Shown on the certificate
            </span>
          </div>
          <div>
            <label htmlFor="cert_title" className="mb-1.5 block text-[13px] font-semibold text-tertiary">
              Certificate Title
            </label>
            <input
              id="cert_title"
              value={certTitle}
              onChange={(e) => setCertTitle(e.target.value)}
              placeholder="e.g. Certificate of Participation"
              className="input h-11 rounded-xl text-[15px]"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="event_date" className="mb-1.5 block text-[13px] font-semibold text-tertiary">
                Certificate Issue Date
              </label>
              <input
                id="event_date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="input h-11 rounded-xl text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="valid_until" className="mb-1.5 block text-[13px] font-semibold text-tertiary">
                Valid Until (optional)
              </label>
              <input
                id="valid_until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="input h-11 rounded-xl text-[15px]"
              />
            </div>
          </div>
          <div>
            <label htmlFor="template_id" className="mb-1.5 block text-[13px] font-semibold text-tertiary">
              Certificate Template (optional)
            </label>
            <select
              id="template_id"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="input h-11 rounded-xl text-[15px]"
            >
              <option value="">No template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {selectedTemplate && (
            <label className="flex items-center gap-2.5 text-[14px] text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={cloneTemplate}
                onChange={(e) => setCloneTemplate(e.target.checked)}
                className="size-4 rounded border-border-strong accent-[var(--color-brand-600)]"
              />
              Clone template for this event (independent copy you can customize)
            </label>
          )}
          <div className="border-t border-border pt-4">
            <label htmlFor="cert_number_Prefix" className="mb-1.5 block text-[13px] font-semibold text-tertiary">
              Certificate Number Prefix
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="cert_number_Prefix"
                value={certNumberPrefix}
                onChange={(e) => setCertNumberPrefix(sanitizePrefix(e.target.value))}
                required
                placeholder="CERT-"
                className="input h-11 min-w-0 flex-1 rounded-xl text-[15px] font-mono"
              />
              <span className="text-[15px] text-tertiary font-mono">####</span>
            </div>
            <p className="mt-1.5 text-[11px] text-tertiary">
              A <code>#</code> counter is appended automatically (shared per prefix).
            </p>
            <p className="mt-1 text-[11px] text-tertiary">
              Next certificate will look like:{" "}
              <code className="rounded-md bg-surface-tertiary px-1.5 py-0.5 font-mono">{sampleNumber}</code>
            </p>
          </div>
          {previewTemplate && (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="btn-brand-soft rounded-xl"
            >
              Preview Certificate
            </button>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/events"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl px-5 text-[15px] font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)] active:scale-[0.97] cursor-pointer sm:w-auto"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-brand h-11 w-full rounded-xl px-6 text-[15px] font-semibold disabled:opacity-50 sm:w-auto"
          >
            {loading ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>

      {previewOpen && previewTemplate && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/5 backdrop-blur-sm"
            onClick={() => setPreviewOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto max-h-[95vh] max-w-[95vw] rounded-2xl bg-[var(--color-surface)] shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">Certificate Preview</h3>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="rounded-full w-7 h-7 flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <div className="p-3 overflow-auto cert-canvas">
                <div className="relative w-full h-full min-w-[400px] min-h-[300px] bg-white rounded-lg shadow-md overflow-hidden">
                  <iframe
                    srcDoc={previewSrcDoc}
                    className="w-full h-full bg-white block"
                    title="Template Preview"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
