"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { issueCertificatesForCompletedAction } from "@/features/events/server/attendee.actions";
import type { Event } from "@/types/event";
import { PlusIcon, UploadIcon, InfoIcon } from "lucide-react";

const AttendeesManager = dynamic(
  () => import("@/features/events/components/attendees-manager"),
  { ssr: false }
);

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
  const [issueMessage, setIssueMessage] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  async function handleIssueSelected() {
    setIssueBusy(true);
    setIssueMessage(null);
    try {
      const result = await issueCertificatesForCompletedAction(event.id, {
        send_email: true,
        attendeeIds: selectedAttendeeIds,
      });
      const failed = result.results.filter((r) => !r.success).length;
      setIssueMessage(
        `${result.issued} issued, ${result.emailed} emailed` +
          (failed ? `, ${failed} failed` : "")
      );
      setSelectedAttendeeIds([]);
      setRefresh((n) => n + 1);
    } catch (err) {
      setIssueMessage(err instanceof Error ? err.message : "Failed to issue certificates");
    } finally {
      setIssueBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {issueMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-success-text)]" />
          <p className="text-[var(--color-success-text)]">{issueMessage}</p>
        </div>
      )}
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
