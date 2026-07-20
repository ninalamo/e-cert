"use client";

import { useState, useCallback, useEffect, startTransition } from "react";
import { getEmailLogsAction, sendCertificateEmailAction } from "../server/certificate.actions";
import type { CertificateEmailLog } from "@/types/certificate-email";

export default function EmailHistory({ certificateId }: { certificateId: string }) {
  const [logs, setLogs] = useState<CertificateEmailLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const data = await getEmailLogsAction(certificateId);
    setLogs(data);
    setLoaded(true);
    setLoading(false);
  }, [certificateId]);

  useEffect(() => {
    if (!loaded && !loading) {
      startTransition(() => {
        loadLogs();
      });
    }
  }, [loaded, loading, loadLogs]);

  async function handleSend() {
    setSending(true);
    setError(null);
    setSuccess(null);
    const result = await sendCertificateEmailAction(certificateId);
    if (result?.success) {
      setSuccess("Email sent successfully!");
      loadLogs();
    } else {
      setError(result?.error || "Failed to send email");
    }
    setSending(false);
  }

  const successfulLogs = logs.filter((l) => l.status === "sent");
  const lastSent = successfulLogs.length > 0 ? successfulLogs[0] : null;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-text)]">{error}</div>
      )}
      {success && (
        <div className="rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3 text-sm text-[var(--color-success-text)]">{success}</div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          {loading ? (
            <span className="text-muted-foreground">Loading...</span>
          ) : lastSent ? (
            <div className="space-y-1">
              <p className="text-muted-foreground">
                Last sent to <span className="font-medium text-foreground">{lastSent.sent_to}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                on {new Date(lastSent.sent_at).toLocaleString()}
              </p>
              {successfulLogs.length > 1 && (
                <p className="text-muted-foreground text-xs">
                  ({successfulLogs.length} total emails sent)
                </p>
              )}
            </div>
          ) : null}
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="btn-brand shrink-0"
        >
          {sending ? "Sending..." : "Email Certificate to Participant"}
        </button>
      </div>
    </div>
  );
}
