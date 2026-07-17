"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ORG_ID } from "@/lib/org";
import { getEventsAction, deleteEventAction } from "@/features/events/server/event.actions";
import type { Event } from "@/types/event";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
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
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          New Event
        </Link>
      </div>

      {!ready && <p className="text-muted-foreground text-sm">Loading events...</p>}

      {ready && events.length === 0 && (
        <div className="border rounded-md p-8 text-center">
          <p className="text-muted-foreground">No events yet. Create your first one.</p>
        </div>
      )}

      {ready && events.length > 0 && (
        <div className="border rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Location</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="hover:underline"
                    >
                      {event.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {event.event_date
                      ? new Date(event.event_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {event.location || "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[event.status] ?? "bg-gray-100"}`}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="text-xs text-blue-600 hover:underline mr-3"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(event.id, event.name)}
                      className="text-xs text-red-600 hover:underline"
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
