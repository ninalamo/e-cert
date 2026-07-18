"use client";

import { useState } from "react";
import Link from "next/link";
import {
  getAttendeesAction,
  addAttendeeAction,
  updateAttendeeAction,
  removeAttendeeAction,
  issueCertificatesForCompletedAction,
} from "@/features/events/server/attendee.actions";
import type { EventAttendee } from "@/types/event-attendee";

export default function AttendeesManager({
  eventId,
  organizationId,
}: {
  eventId: string;
  organizationId: string;
}) {
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await getAttendeesAction(eventId);
    setAttendees(data);
    setLoaded(true);
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    const result = await addAttendeeAction({
      event_id: eventId,
      organization_id: organizationId,
      name,
      email,
    });
    setBusy(false);
    if (result.error) {
      setError(result.error);
    } else {
      setName("");
      setEmail("");
      await load();
      setMessage("Attendee added.");
    }
  }

  async function toggle(id: string, field: "attended" | "completed", value: boolean) {
    setError(null);
    const result = await updateAttendeeAction(id, { [field]: value });
    if (result.error) {
      setError(result.error);
    } else if (result.attendee) {
      setAttendees((prev) => prev.map((a) => (a.id === id ? result.attendee! : a)));
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this attendee?")) return;
    const result = await removeAttendeeAction(id);
    if (result.error) {
      setError(result.error);
    } else {
      await load();
    }
  }

  async function handleBulkIssue() {
    setError(null);
    setMessage(null);
    setBusy(true);
    const result = await issueCertificatesForCompletedAction(eventId, {
      send_email: sendEmail,
    });
    setBusy(false);
    await load();
    const failed = result.results.filter((r) => !r.success).length;
    setMessage(
      `${result.issued} certificate(s) issued` +
        (failed ? `, ${failed} failed` : "")
    );
  }

  const completedCount = attendees.filter((a) => a.completed && !a.certificate_id).length;

  if (!loaded) {
    return (
      <button
        type="button"
        onClick={load}
        className="btn-brand-soft"
      >
        Load Attendees
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Attendees</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBulkIssue}
            disabled={busy || completedCount === 0}
            className="btn-brand-soft disabled:opacity-50"
          >
            {busy ? "Issuing..." : `Issue for completed (${completedCount})`}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">{message}</div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex gap-2 text-xs text-muted-foreground">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
          />
          Email certificates when issued
        </label>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-48 rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-56 rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" disabled={busy} className="btn-brand disabled:opacity-50">
          {busy ? "Adding..." : "Add Attendee"}
        </button>
      </form>

      {attendees.length === 0 ? (
        <div className="border rounded-md p-8 text-center">
          <p className="text-muted-foreground">No attendees yet.</p>
        </div>
      ) : (
        <div className="tbl-container">
          <table className="tbl">
            <thead>
              <tr>
                <th className="text-left">Name</th>
                <th className="text-left">Email</th>
                <th className="text-left">Attended</th>
                <th className="text-left">Completed</th>
                <th className="text-left">Certificate</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{a.name}</td>
                  <td className="text-tertiary">{a.email}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={a.attended}
                      onChange={(e) => toggle(a.id, "attended", e.target.checked)}
                      title="Attended"
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={a.completed}
                      onChange={(e) => toggle(a.id, "completed", e.target.checked)}
                      title="Completed"
                    />
                  </td>
                  <td>
                    {a.certificate_id ? (
                      <Link
                        href={`/certificates/${a.certificate_id}`}
                        className="text-xs text-info hover:underline"
                      >
                        View
                      </Link>
                    ) : a.completed ? (
                      <span className="text-xs text-amber-600">Pending issue</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => handleRemove(a.id)}
                      className="text-xs text-danger hover:underline"
                    >
                      Remove
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
