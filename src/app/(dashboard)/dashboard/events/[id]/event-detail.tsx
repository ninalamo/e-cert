"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getEventWithStatsAction,
  updateEventAction,
} from "@/features/events/server/event.actions";
import type { Event } from "@/types/event";
import type { Certificate } from "@/types/certificate";
import type { CertificateTemplate } from "@/types/template";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
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

  useEffect(() => {
    let active = true;
    getEventWithStatsAction(eventId).then((result) => {
      if (active) {
        setData(result);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [eventId]);

  async function handleStatusChange(newStatus: "draft" | "published" | "completed") {
    const result = await updateEventAction(eventId, { status: newStatus });
    if (!result?.error && result?.event) {
      setData((prev) => prev ? { ...prev, event: result.event! } : prev);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading event...</p>;
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
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Issue Certificate
          </Link>
          <Link
            href={`/dashboard/events/${eventId}/upload`}
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Upload CSV
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 text-sm">
        <div className="rounded-md border p-4">
          <p className="font-medium text-muted-foreground">Status</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[event.status] ?? "bg-gray-100"}`}>
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
          <div className="border rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-2 text-left">Number</th>
                  <th className="px-4 py-2 text-left">Recipient</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Issued</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{cert.certificate_number}</td>
                    <td className="px-4 py-2">{cert.recipient_name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{cert.recipient_email}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(cert.issued_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      {cert.revoked_at ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          Revoked
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/dashboard/certificates/${cert.id}`}
                        className="text-xs text-blue-600 hover:underline"
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
    </div>
  );
}
