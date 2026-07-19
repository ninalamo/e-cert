"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ORG_ID } from "@/lib/org";
import { getEventAction, issueEventCertificateAction } from "@/features/events/server/event.actions";
import type { Event } from "@/types/event";
import { SkeletonDetail } from "@/components/ui/skeleton";
import { InfoIcon } from "lucide-react";

export default function IssueEventCertForm({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    getEventAction(eventId).then((e) => {
      if (active) {
        setEvent(e);
        if (e && e.status !== "active") {
          setError(
            e.status === "draft"
              ? "This event is still a draft. Activate it before issuing certificates."
              : "This event is archived. Certificate issuance is no longer available."
          );
        }
      }
    });
    return () => { active = false; };
  }, [eventId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const result = await issueEventCertificateAction({
      event_id: eventId,
      organization_id: ORG_ID,
      recipient_name: name,
      recipient_email: email,
      send_email: sendEmail,
    });

    if (result?.error) {
      setError(result.error);
    } else if (result?.certificate) {
      setSuccess(`Certificate ${result.certificate.certificate_number} issued!`);
      setName("");
      setEmail("");
    }

    setLoading(false);
  }

  if (!event) {
    return <SkeletonDetail />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Issue Certificate
        </h1>
        <p className="mt-1 text-sm text-tertiary">
          Event: {event.name}
          {event.certificate_title && ` — ${event.certificate_title}`}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
            <p className="text-[var(--color-danger-text)]">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3 text-sm">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-success-text)]" />
            <p className="text-[var(--color-success-text)]">{success}</p>
          </div>
        )}
        {event.status === "active" &&
          event.valid_until &&
          new Date(event.valid_until) <= new Date() && (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-warning-text)]" />
              <p className="text-[var(--color-warning-text)]">
                This event&apos;s validity period has ended. Certificates issued may not
                be valid.
              </p>
            </div>
          )}

        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-tertiary mb-1">
            Recipient Name *
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={event.status !== "active"}
            className="input text-sm disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-tertiary mb-1">
            Recipient Email *
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={event.status !== "active"}
            className="input text-sm disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={sendEmail}
            onClick={() => setSendEmail(!sendEmail)}
            disabled={event.status !== "active"}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 ${sendEmail ? "bg-[var(--color-success)]" : "bg-[var(--color-border-strong)]"}`}
          >
            <span
              className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${sendEmail ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
          <label className="text-sm font-medium text-secondary">
            Send certificate email to recipient
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)] active:scale-[0.97] cursor-pointer"
          >
            Back to Event
          </Link>
          <button
            type="submit"
            disabled={loading || event.status !== "active"}
            className="btn-brand disabled:opacity-50"
          >
            {loading ? "Issuing..." : "Issue Certificate"}
          </button>
        </div>
      </form>
    </div>
  );
}
