"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ORG_ID } from "@/lib/org";
import {
  getEventAction,
  bulkIssueEventCertificatesAction,
} from "@/features/events/server/event.actions";
import type { Event } from "@/types/event";
import { SkeletonDetail } from "@/components/ui/skeleton";

interface Recipient {
  name: string;
  email: string;
}

interface BulkResult {
  name: string;
  email: string;
  success: boolean;
  certNumber?: string;
  error?: string;
}

export default function UploadCsvForm({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [sendEmail, setSendEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getEventAction(eventId).then((e) => {
      if (active) setEvent(e);
    });
    return () => { active = false; };
  }, [eventId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setError("CSV must have a header row and at least one data row");
        return;
      }

      const header = lines[0].toLowerCase();
      const hasName = header.includes("name");
      const hasEmail = header.includes("email");

      if (!hasName || !hasEmail) {
        setError("CSV must have 'name' and 'email' columns");
        return;
      }

      const nameIdx = header.split(",").findIndex((h) => h.trim() === "name");
      const emailIdx = header.split(",").findIndex((h) => h.trim() === "email");

      const parsed: Recipient[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        const n = cols[nameIdx];
        const em = cols[emailIdx];
        if (n && em) {
          parsed.push({ name: n, email: em });
        }
      }

      setRecipients(parsed);
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    if (recipients.length === 0) return;
    setError(null);
    setLoading(true);

    const result = await bulkIssueEventCertificatesAction({
      event_id: eventId,
      organization_id: ORG_ID,
      recipients,
      send_email: sendEmail,
    });

    setResults(result.results);
    setLoading(false);
  }

  if (!event) {
    return <SkeletonDetail />;
  }

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results?.filter((r) => !r.success).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload CSV</h1>
        <p className="text-muted-foreground text-sm">
          Bulk issue certificates for: {event.name}
        </p>
      </div>

      {!results && (
        <div className="space-y-4 max-w-lg">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium">
              CSV File (columns: name, email)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {fileName && (
            <p className="text-sm text-muted-foreground">
              {fileName} — {recipients.length} recipient(s) found
            </p>
          )}

          {recipients.length > 0 && (
            <div className="border rounded-md p-4 space-y-2">
              <p className="text-sm font-medium">Preview (first 5 rows)</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 text-left">Name</th>
                    <th className="py-1 text-left">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1">{r.name}</td>
                      <td className="py-1 text-muted-foreground">{r.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recipients.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  ...and {recipients.length - 5} more
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              id="send_email"
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="send_email" className="text-sm font-medium">
              Send certificate emails to all recipients
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href={`/events/${eventId}`}
              className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Back to Event
            </Link>
            <button
              onClick={handleUpload}
              disabled={loading || recipients.length === 0}
              className="btn-brand disabled:opacity-50"
            >
              {loading
                ? "Issuing..."
                : `Issue ${recipients.length} Certificate(s)`}
            </button>
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex gap-4 text-sm">
            <span className="text-green-600 font-medium">{successCount} issued</span>
            {failCount > 0 && (
              <span className="text-red-600 font-medium">{failCount} failed</span>
            )}
          </div>

          <div className="tbl-container">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="text-left">Name</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Certificate #</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td className="text-tertiary">{r.email}</td>
                    <td>
                      {r.success ? (
                        <span className="status-pill status-active">
                          Issued
                        </span>
                      ) : (
                        <span className="status-pill status-revoked">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-xs">
                      {r.certNumber ?? r.error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href={`/events/${eventId}`}
              className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Back to Event
            </Link>
            <button
              onClick={() => {
                setResults(null);
                setRecipients([]);
                setFileName(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="btn-brand"
            >
              Upload More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
