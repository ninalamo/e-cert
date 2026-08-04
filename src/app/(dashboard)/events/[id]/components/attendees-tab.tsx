"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import type { Event } from "@/types/event";
import { PlusIcon, UploadIcon, Loader2Icon, InfoIcon, XIcon, DownloadIcon, CheckCircle2Icon, XCircleIcon, ShieldIcon, RefreshCwIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const AttendeesManager = dynamic(
  () => import("@/features/events/components/attendees-manager"),
  { ssr: false }
);

interface IssueResult {
  name: string;
  email: string;
  success: boolean;
  emailed?: boolean;
  certNumber?: string;
  error?: string;
}

interface IssueSummary {
  issued: number;
  emailed: number;
  results: IssueResult[];
}

export default function AttendeesTab({
  event,
  canManageAttendees,
  canIssue,
  isAdmin = false,
}: {
  event: Event;
  canManageAttendees: boolean;
  canIssue: boolean;
  isAdmin?: boolean;
}) {
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [issueBusy, setIssueBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [issueSummary, setIssueSummary] = useState<IssueSummary | null>(null);
  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  const [confirmReissueOpen, setConfirmReissueOpen] = useState(false);
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);
  const [reissueBusy, setReissueBusy] = useState(false);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [expiredCount, setExpiredCount] = useState(0);

  useEffect(() => {
    if (!issueBusy) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [issueBusy]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/events/${event.id}/revoke-expired`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `Request failed (${res.status})`);
        }
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          const n = Number(json?.expired);
          setExpiredCount(Number.isFinite(n) ? n : 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExpiredCount(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refresh, event.id]);

  async function handleIssueSelected() {
    setIssueBusy(true);
    setIssueSummary(null);
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

      const result: IssueSummary = await res.json();
      setIssueSummary(result);
      setSelectedAttendeeIds([]);
      setRefresh((n) => n + 1);

      const failed = result.results.filter((r) => !r.success).length;
      if (failed > 0) {
        toast.warning(`${result.issued} issued, ${failed} failed`, { duration: 8000 });
      } else {
        toast.success(`${result.issued} issued, ${result.emailed} emailed`, { duration: 8000 });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start certificate issuance");
    } finally {
      setIssueBusy(false);
    }
  }

  async function handleRevokeExpired() {
    setRevokeBusy(true);
    try {
      const res = await fetch(`/api/events/${event.id}/revoke-expired`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const result = await res.json();
      setConfirmRevokeOpen(false);
      setRefresh((n) => n + 1);

      if (result.revoked > 0) {
        toast.success(`Revoked ${result.revoked} expired certificate(s)`);
      } else {
        toast.info("No expired certificates found");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke expired certificates");
    } finally {
      setRevokeBusy(false);
    }
  }

  async function handleReissueSelected() {
    setReissueBusy(true);
    try {
      const res = await fetch(`/api/events/${event.id}/reissue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeIds: selectedAttendeeIds }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const result = await res.json();
      setConfirmReissueOpen(false);
      setRefresh((n) => n + 1);
      setIssueSummary(null);

      toast.success(`Re-issued ${result.reissued} certificate(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to re-issue certificates");
    } finally {
      setReissueBusy(false);
    }
  }

  function getIssueDialogDescription(): string {
    if (selectedAttendeeIds.length === 0) return "";
    return "Are you sure? This will issue certificates to attendees that are not yet issued. Attendees that already have a certificate will be re-issued with updated details while keeping the same certificate number.";
  }

  function downloadCsv() {
    if (!issueSummary) return;
    const header = "Name,Email,Issued,Emailed,Error\n";
    const rows = issueSummary.results.map((r) =>
      [
        `"${r.name}"`,
        `"${r.email}"`,
        r.success ? "Yes" : "No",
        r.emailed ? "Yes" : r.success ? "No" : "N/A",
        r.error ? `"${r.error.replace(/"/g, '""')}"` : "",
      ].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-issuance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (issueBusy) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 shadow-lg">
          <Loader2Icon className="size-10 animate-spin text-brand-600" />
          <div className="text-center">
            <p className="text-lg font-semibold">Issuing certificates...</p>
            <p className="text-sm text-muted-foreground">Please do not close or navigate away.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {issueSummary && (
        <div className="rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4 text-sm">
          <div className="flex items-start gap-3">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-info-text)]" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-[var(--color-info-text)]">
                  Certificate issuance completed
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={downloadCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-info-text)] hover:opacity-80"
                  >
                    <DownloadIcon className="size-3" />
                    Download CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setIssueSummary(null)}
                    className="text-[var(--color-info-text)] hover:opacity-70"
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-[var(--color-info-text)] opacity-80">
                {issueSummary.issued} issued, {issueSummary.emailed} emailed
                {issueSummary.results.filter((r) => !r.success).length > 0 &&
                  `, ${issueSummary.results.filter((r) => !r.success).length} failed`}
              </p>

              {issueSummary.results.some((r) => !r.success) && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-[var(--color-info-text)] opacity-70">Failed:</p>
                  {issueSummary.results.filter((r) => !r.success).map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[var(--color-info-text)] opacity-80">
                      <XCircleIcon className="size-3 shrink-0 text-red-500" />
                      <span className="truncate">{r.email}</span>
                      <span className="shrink-0 opacity-60">— {r.error}</span>
                    </div>
                  ))}
                </div>
              )}

              {issueSummary.results.some((r) => r.success && r.emailed) && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-[var(--color-info-text)] opacity-70">Emailed:</p>
                  {issueSummary.results.filter((r) => r.success && r.emailed).map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[var(--color-info-text)] opacity-80">
                      <CheckCircle2Icon className="size-3 shrink-0 text-green-600" />
                      <span className="truncate">{r.email}</span>
                    </div>
                  ))}
                </div>
              )}

              {issueSummary.results.some((r) => r.success && !r.emailed) && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-[var(--color-info-text)] opacity-70">Issued (no email):</p>
                  {issueSummary.results.filter((r) => r.success && !r.emailed).map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[var(--color-info-text)] opacity-80">
                      <CheckCircle2Icon className="size-3 shrink-0 text-amber-500" />
                      <span className="truncate">{r.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => canManageAttendees && setShowAddDialog(true)}
          disabled={!canManageAttendees}
          title={canManageAttendees ? undefined : "Attendees can only be added while the event is in Draft or Active"}
          className="btn"
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
            onClick={() => setConfirmIssueOpen(true)}
            disabled={issueBusy || !canIssue}
            title={
              canIssue
                ? undefined
                : "Certificates can only be issued while the event is Active"
            }
            className="btn"
          >
            {issueBusy
              ? "Issuing..."
              : "Issue Certificate"}
          </button>
        )}
        {isAdmin && expiredCount > 0 && (
          <button
            type="button"
            onClick={() => setConfirmRevokeOpen(true)}
            disabled={revokeBusy}
            className="btn bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40"
          >
            <ShieldIcon className="size-4" />
            Revoke Expired ({expiredCount})
          </button>
        )}
      </div>
      <AttendeesManager
        eventId={event.id}
        organizationId={event.organization_id}
        readOnly={!canManageAttendees}
        isAdmin={isAdmin}
        onSelectionChange={setSelectedAttendeeIds}
        showAddDialog={showAddDialog}
        onAddDialogHandled={() => setShowAddDialog(false)}
        refreshTrigger={refresh}
      />
        <Dialog open={confirmIssueOpen} onOpenChange={setConfirmIssueOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Certificate</DialogTitle>
              <DialogDescription>
                {getIssueDialogDescription()}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmIssueOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setConfirmIssueOpen(false);
                  handleIssueSelected();
                }}
              >
                Issue Certificate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={confirmReissueOpen} onOpenChange={setConfirmReissueOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Re/Issue Certificate</DialogTitle>
              <DialogDescription>
                This will re-issue certificates for the selected attendees.
                Existing certificates will be updated with new details while keeping the same certificate number.
                Any changes to the certificate template or metadata will be applied.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmReissueOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmReissueOpen(false);
                  handleReissueSelected();
                }}
              >
                Re/Issue Certificate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={confirmRevokeOpen} onOpenChange={setConfirmRevokeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke Expired Certificates</DialogTitle>
              <DialogDescription>
                Are you sure? This will revoke all expired certificates for this event.
                Attendees will need to be re-issued if they still need a certificate.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmRevokeOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmRevokeOpen(false);
                  handleRevokeExpired();
                }}
              >
                Revoke Expired
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
