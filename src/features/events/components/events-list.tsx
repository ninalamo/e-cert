"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ORG_ID } from "@/lib/org";
import { getEventsAction, deleteEventAction } from "@/features/events/server/event.actions";
import type { Event } from "@/types/event";
import { SkeletonTable } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  draft: "status-pill status-draft",
  published: "status-pill status-active",
  completed: "status-pill status-info",
};

export default function EventsList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    getEventsAction(ORG_ID).then((data) => {
      if (active) {
        setEvents(data);
        setReady(true);
      }
    });
    return () => { active = false; };
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete event "${name}"? This will not delete the certificates.`)) return;
    const result = await deleteEventAction(id);
    if (result?.error) {
      alert(result.error);
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link
          href="/dashboard/events/new"
          className="btn-brand"
        >
          New Event
        </Link>
      </div>

      {!ready && <SkeletonTable rows={5} />}

      {ready && events.length === 0 && (
        <div className="border rounded-md p-8 text-center">
          <p className="text-muted-foreground">No events yet. Create your first one.</p>
        </div>
      )}

      {ready && events.length > 0 && (
        <div className="tbl-container">
          <table className="tbl">
            <thead>
              <tr>
                <th className="text-left">Name</th>
                <th className="text-left">Date</th>
                <th className="text-left">Location</th>
                <th className="text-left">Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="font-medium">
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="hover:underline"
                    >
                      {event.name}
                    </Link>
                  </td>
                  <td className="text-tertiary">
                    {event.event_date
                      ? new Date(event.event_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="text-tertiary">
                    {event.location || "—"}
                  </td>
                  <td>
                    <span className={statusColors[event.status] ?? "status-pill status-draft"}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="text-xs text-info hover:underline mr-3"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(event.id, event.name)}
                      className="text-xs text-danger hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
