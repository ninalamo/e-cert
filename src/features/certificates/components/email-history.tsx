"use client";

import { useState, useCallback } from "react";
import { getEmailLogsAction, sendCertificateEmailAction } from "../server/certificate.actions";
import type { CertificateEmailLog } from "@/types/certificate-email";
import { SkeletonList } from "@/components/ui/skeleton";

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

  if (!loaded && !loading) {
    loadLogs();
  }

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Email History</h3>
        <button
          onClick={handleSend}
          disabled={sending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send Email"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">{success}</div>
      )}

      {loading && <SkeletonList rows={3} />}

      {!loading && logs.length === 0 && (
        <p className="text-muted-foreground text-sm">No emails sent yet.</p>
      )}

      {!loading && logs.length > 0 && (
        <div className="tbl-container">
          <table className="tbl">
            <thead>
              <tr>
                <th className="text-left">Sent At</th>
                <th className="text-left">To</th>
                <th className="text-left">Status</th>
                <th className="text-left">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    {new Date(log.sent_at).toLocaleString()}
                  </td>
                  <td className="text-tertiary">{log.sent_to}</td>
                  <td>
                    {log.status === "sent" ? (
                      <span className="status-pill status-active">
                        Sent
                      </span>
                    ) : (
                      <span className="status-pill status-revoked">
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="text-tertiary text-xs">
                    {log.error_message ?? "—"}
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
