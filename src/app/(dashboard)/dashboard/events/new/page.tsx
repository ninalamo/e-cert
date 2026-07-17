"use client";

import { useState, useEffect } from "react";
import { ORG_ID } from "@/lib/org";
import { getTemplatesAction } from "@/features/templates/server/template.actions";
import { createEventAction, cloneTemplateForEventAction } from "@/features/events/server/event.actions";
import type { CertificateTemplate } from "@/types/template";
import Link from "next/link";

export default function NewEventPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [cloneTemplate, setCloneTemplate] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [certTitle, setCertTitle] = useState("Certificate of Participation");
  const [validUntil, setValidUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    getTemplatesAction(ORG_ID).then((data) => {
      if (active) setTemplates(data);
    });
    return () => { active = false; };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await createEventAction({
      organization_id: ORG_ID,
      name,
      description: description || undefined,
      event_date: eventDate || undefined,
      location: location || undefined,
      organizer: organizer || undefined,
      certificate_title: certTitle || undefined,
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

    window.location.href = "/dashboard/events";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Event</h1>
        <p className="text-muted-foreground text-sm">Create a new event</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Event Name *
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Graduation Ceremony 2026"
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="event_date" className="block text-sm font-medium">
              Event Date
            </label>
            <input
              id="event_date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description of the event"
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="location" className="block text-sm font-medium">
              Location
            </label>
            <input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. School Auditorium"
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="organizer" className="block text-sm font-medium">
              Organizer
            </label>
            <input
              id="organizer"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              placeholder="e.g. Office of the Registrar"
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="cert_title" className="block text-sm font-medium">
              Certificate Title
            </label>
            <input
              id="cert_title"
              value={certTitle}
              onChange={(e) => setCertTitle(e.target.value)}
              placeholder="e.g. Certificate of Participation"
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="valid_until" className="block text-sm font-medium">
              Valid Until (optional)
            </label>
            <input
              id="valid_until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>

        {templates.length > 0 && (
          <div className="border rounded-md p-4 space-y-3">
            <p className="text-sm font-medium">Certificate Template (optional)</p>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="block w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">No template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cloneTemplate}
                  onChange={(e) => setCloneTemplate(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Clone template for this event (independent copy you can customize)
              </label>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Link
            href="/dashboard/events"
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
