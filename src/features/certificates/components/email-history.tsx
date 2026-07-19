"use client";

import { useState, useCallback, useEffect } from "react";
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
      loadLogs();
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
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">{success}</div>
      )}

      <div className="flex items-center justify-between">
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
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? "Sending..." : "Email Certificate to Participant"}
        </button>
      </div>
    </div>
  );
}
