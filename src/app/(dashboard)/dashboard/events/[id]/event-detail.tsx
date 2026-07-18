"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getEventWithStatsAction,
  updateEventAction,
} from "@/features/events/server/event.actions";
import AttendeesManager from "@/features/events/components/attendees-manager";
import { getTemplatesAction } from "@/features/templates/server/template.actions";
import type { Event } from "@/types/event";
import type { Certificate } from "@/types/certificate";
import type { CertificateTemplate } from "@/types/template";
import { SkeletonDetail } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  draft: "status-pill status-draft",
  published: "status-pill status-active",
  completed: "status-pill status-info",
};

interface EventDetailData {
  event: Event;
  template: CertificateTemplate | null;
  stats: { total: number; active: number; revoked: number };
  certificates: Certificate[];
}

export default function EventDetail({ eventId }: { eventId: string }) {
  const [data, setData] = useState<EventDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateMsg, setTemplateMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getEventWithStatsAction(eventId).then((result) => {
      if (active) {
        setData(result);
        setSelectedTemplate(result?.event.template_id ?? "");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [eventId]);

  useEffect(() => {
    let active = true;
    getTemplatesAction(data?.event.organization_id ?? "").then((t) => {
      if (active) setTemplates(t);
    }).catch(() => {});
    return () => { active = false; };
  }, [data?.event.organization_id]);

  async function handleStatusChange(newStatus: "draft" | "published" | "completed") {
    const result = await updateEventAction(eventId, { status: newStatus });
    if (!result?.error && result?.event) {
      setData((prev) => prev ? { ...prev, event: result.event! } : prev);
    }
  }

  async function handleTemplateSave() {
    setSavingTemplate(true);
    setTemplateMsg(null);
    const result = await updateEventAction(eventId, {
      template_id: selectedTemplate || undefined,
    });
    if (result?.error) {
      setTemplateMsg(result.error ?? "Failed to update template");
    } else if (result?.event) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              event: result.event!,
              template:
                templates.find((t) => t.id === (selectedTemplate || undefined)) ??
                null,
            }
          : prev
      );
      setTemplateMsg("Template updated.");
    }
    setSavingTemplate(false);
  }

  if (loading) {
    return <SkeletonDetail />;
  }

  if (!data) {
    return <p className="text-red-600 text-sm">Event not found</p>;
  }

  const { event, template, stats, certificates } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-muted-foreground text-sm">
            {event.event_date && new Date(event.event_date).toLocaleDateString()}
            {event.location && ` — ${event.location}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/events/${eventId}/issue`}
            className="btn-brand"
          >
            Issue Certificate
          </Link>
            <Link
              href={`/dashboard/events/${eventId}/upload`}
              className="btn-brand-soft"
            >
              Upload CSV
            </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 text-sm">
        <div className="rounded-md border p-4">
          <p className="font-medium text-muted-foreground">Status</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={statusColors[event.status] ?? "status-pill status-draft"}>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </span>
            <select
              value={event.status}
              onChange={(e) => handleStatusChange(e.target.value as "draft" | "published" | "completed")}
              className="rounded-md border px-2 py-1 text-xs"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <div className="rounded-md border p-4">
          <p className="font-medium text-muted-foreground">Total Issued</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="font-medium text-muted-foreground">Active</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{stats.active}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="font-medium text-muted-foreground">Revoked</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{stats.revoked}</p>
        </div>
      </div>

      {event.description && (
        <div className="rounded-md border p-4 text-sm">
          <p className="font-medium text-muted-foreground">Description</p>
          <p className="mt-1">{event.description}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="rounded-md border p-4">
          <p className="font-medium text-muted-foreground">Organizer</p>
          <p className="mt-1">{event.organizer || "—"}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="font-medium text-muted-foreground">Certificate Title</p>
          <p className="mt-1">{event.certificate_title || "—"}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="font-medium text-muted-foreground">Template</p>
          <p className="mt-1">{template?.name ?? "No template"}</p>
          <div className="mt-3 space-y-2">
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTemplateSave}
                disabled={savingTemplate || selectedTemplate === (event.template_id ?? "")}
                className="btn-brand disabled:opacity-50"
              >
                {savingTemplate ? "Saving..." : "Assign Template"}
              </button>
              {templateMsg && (
                <span className="text-xs text-muted-foreground">{templateMsg}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {event.valid_until && (
        <div className="rounded-md border p-4 text-sm">
          <p className="font-medium text-muted-foreground">Valid Until</p>
          <p className="mt-1">{new Date(event.valid_until).toLocaleDateString()}</p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Certificates</h2>
        {certificates.length === 0 ? (
          <div className="border rounded-md p-8 text-center">
            <p className="text-muted-foreground">No certificates issued yet for this event.</p>
          </div>
        ) : (
          <div className="tbl-container">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="text-left">Number</th>
                  <th className="text-left">Recipient</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">Issued</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id}>
                    <td className="font-mono text-xs">{cert.certificate_number}</td>
                    <td>{cert.recipient_name}</td>
                    <td className="text-tertiary">{cert.recipient_email}</td>
                    <td className="text-tertiary">
                      {new Date(cert.issued_at).toLocaleDateString()}
                    </td>
                    <td>
                      {cert.revoked_at ? (
                        <span className="status-pill status-revoked">
                          Revoked
                        </span>
                      ) : (
                        <span className="status-pill status-active">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/dashboard/certificates/${cert.id}`}
                        className="text-xs text-info hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AttendeesManager
        eventId={eventId}
        organizationId={event.organization_id}
      />
    </div>
  );
}
