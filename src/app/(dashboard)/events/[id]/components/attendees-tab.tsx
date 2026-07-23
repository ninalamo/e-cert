"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import type { Event } from "@/types/event";
import { PlusIcon, UploadIcon } from "lucide-react";

const AttendeesManager = dynamic(
  () => import("@/features/events/components/attendees-manager"),
  { ssr: false }
);

async function pollWorkflowStatus(
  runId: string,
  { onProgress, signal }: { onProgress?: (status: string) => void; signal?: AbortSignal }
): Promise<{ status: string; result?: { issued: number; emailed: number; results: unknown[] }; error?: string }> {
  for (let i = 0; i < 120; i++) {
    if (signal?.aborted) throw new Error("Aborted");
    await new Promise((r) => setTimeout(r, 1000));
    onProgress?.(`Polling (${i + 1}s)...`);

    const res = await fetch(`/api/workflow-status?runId=${runId}`);
    if (!res.ok) continue;
    const data = await res.json();

    if (data.status === "completed") return data;
    if (data.status === "failed") return { status: "failed", error: data.error ?? "Workflow failed" };
  }
  return { status: "timeout", error: "Workflow timed out" };
}

export default function AttendeesTab({
  event,
  canManageAttendees,
  canIssue,
}: {
  event: Event;
  canManageAttendees: boolean;
  canIssue: boolean;
}) {
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [issueBusy, setIssueBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  async function handleIssueSelected() {
    const count = selectedAttendeeIds.length;
    setIssueBusy(true);
    try {
      const res = await fetch(`/api/events/${event.id}/bulk-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeIds: selectedAttendeeIds, sendEmail: true }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const { runId } = await res.json();
      setSelectedAttendeeIds([]);
      toast.loading(`Issuing ${count} certificate${count > 1 ? "s" : ""}...`, {
        id: `bulk-issue-${runId}`,
      });

      pollWorkflow(runId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start certificate issuance");
    } finally {
      setIssueBusy(false);
    }
  }

  function pollWorkflow(runId: string) {
    const toastId = `bulk-issue-${runId}`;
    let attempts = 0;
    const maxAttempts = 120;

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        toast.error("Timed out waiting for certificate issuance", { id: toastId });
        return;
      }

      try {
        const res = await fetch(`/api/workflow-status?runId=${runId}`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.status === "completed" && data.result) {
          clearInterval(interval);
          const { issued, emailed, results } = data.result;
          const failed = results.filter((r: { success: boolean }) => !r.success).length;
          toast.success(
            `${issued} issued, ${emailed} emailed` + (failed ? `, ${failed} failed` : ""),
            { id: toastId, duration: 8000 }
          );
          setSelectedAttendeeIds([]);
          setRefresh((n) => n + 1);
        } else if (data.status === "failed") {
          clearInterval(interval);
          toast.error("Certificate issuance failed", { id: toastId });
          setRefresh((n) => n + 1);
        }
      } catch {
        // Retry on network errors
      }
    }, 3000);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => canManageAttendees && setShowAddDialog(true)}
          disabled={!canManageAttendees}
          title={canManageAttendees ? undefined : "Attendees can only be added while the event is in Draft or Active"}
          className="btn-brand"
        >
          <PlusIcon className="size-4" />
          Add Attendee
        </button>
        <Link
          href={`/events/${event.id}/upload`}
          aria-disabled={!canManageAttendees}
          onClick={(e) => { if (!canManageAttendees) e.preventDefault(); }}
          title={canManageAttendees ? undefined : "Attendees can only be imported while the event is in Draft or Active"}
          className={`btn ${!canManageAttendees ? "opacity-50 pointer-events-none cursor-not-allowed" : ""}`}
        >
          <UploadIcon className="size-4" />
          Bulk Import
        </Link>
        {selectedAttendeeIds.length > 0 && (
          <button
            type="button"
            onClick={handleIssueSelected}
            disabled={issueBusy || !canIssue}
            title={
              canIssue
                ? undefined
                : event.status !== "active"
                  ? "Certificates can only be issued while the event is Active"
                  : "Certificate issuance is available on or after the event date"
            }
            className="btn-brand"
          >
            {issueBusy
              ? "Issuing..."
              : `Issue Certificate (${selectedAttendeeIds.length})`}
          </button>
        )}
      </div>
      <AttendeesManager
        eventId={event.id}
        organizationId={event.organization_id}
        readOnly={!canManageAttendees}
        onSelectionChange={setSelectedAttendeeIds}
        showAddDialog={showAddDialog}
        onAddDialogHandled={() => setShowAddDialog(false)}
        refreshTrigger={refresh}
      />
    </div>
  );
}
