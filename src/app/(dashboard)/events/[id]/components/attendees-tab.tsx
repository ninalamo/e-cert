"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import type { Event } from "@/types/event";
import { PlusIcon, UploadIcon, Loader2Icon, InfoIcon, XIcon, DownloadIcon, CheckCircle2Icon, XCircleIcon, ShieldIcon } from "lucide-react";
import { getAccessToken, refreshAccessToken } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const BATCH_CHUNK = 25;
const MAX_BATCH = 200;
const CHUNK_TIMEOUT_MS = 60_000;

async function authFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res = await fetch(input, { ...init, headers, redirect: "manual" });

  if (res.type === "opaqueredirect") {
    throw new Error("Request was redirected (302). Please check server configuration.");
  }

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      res = await fetch(input, { ...init, headers, redirect: "manual" });
      if (res.type === "opaqueredirect") {
        throw new Error("Request was redirected after token refresh. Please check server configuration.");
      }
    }
  }

  return res;
}

const AttendeesManager = dynamic(
  () => import("@/features/events/components/attendees-manager"),
  { ssr: false }
);

interface IssueResult {
  name: string;
  email: string;
  success: boolean;
  emailed?: boolean;
  skipped?: boolean;
  certNumber?: string;
  error?: string;
}

interface IssueSummary {
  issued: number;
  emailed: number;
  skipped?: number;
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
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [expiredCount, setExpiredCount] = useState(0);
  const [issueProgress, setIssueProgress] = useState<{ current: number; total: number; processed: number; totalAttendees: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cancelRequestedRef = useRef(false);

  useEffect(() => {
    if (!issueBusy) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Certificates are still being issued. Are you sure you want to leave?";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [issueBusy]);

  useEffect(() => {
    let cancelled = false;
    void authFetch(`/api/events/${event.id}/revoke-expired`)
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
    const allIds = selectedAttendeeIds;
    const effectiveIds = allIds.length > MAX_BATCH ? allIds.slice(0, MAX_BATCH) : allIds;
    const remaining = allIds.length > MAX_BATCH ? allIds.length - MAX_BATCH : 0;
    const chunks: string[][] = [];
    for (let i = 0; i < effectiveIds.length; i += BATCH_CHUNK) {
      chunks.push(effectiveIds.slice(i, i + BATCH_CHUNK));
    }
    const totalChunks = chunks.length;
    const totalAttendees = effectiveIds.length;

    setIssueBusy(true);
    setIssueSummary(null);
    setIssueProgress({ current: 0, total: totalChunks, processed: 0, totalAttendees });
    cancelRequestedRef.current = false;

    let mergedIssued = 0;
    let mergedEmailed = 0;
    let mergedSkipped = 0;
    let mergedResults: IssueResult[] = [];
    let hadChunkError = false;

    try {
      for (let idx = 0; idx < chunks.length; idx++) {
        if (cancelRequestedRef.current) break;

        const chunk = chunks[idx];
        setIssueProgress({ current: idx + 1, total: totalChunks, processed: mergedResults.length, totalAttendees });

        const controller = new AbortController();
        abortRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), CHUNK_TIMEOUT_MS);

        try {
          const res = await authFetch(`/api/events/${event.id}/bulk-issue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attendee_ids: chunk, send_email: true }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (cancelRequestedRef.current) break;

          if (!res.ok) {
            const body = await res.json().catch(() => null);
            const msg = body?.message ?? body?.error ?? `Request failed (${res.status})`;
            // quick-fail this chunk: mark its attendees as failed, keep prior chunks
            hadChunkError = true;
            const chunkFailed: IssueResult[] = chunk.map((_, i) => ({
              name: `Attendee ${i + 1}`,
              email: `chunk-${idx + 1}-attendee-${i + 1}`,
              success: false,
              emailed: false,
              skipped: false,
              error: msg,
            }));
            // try to use server returned results if available for better names
            if (body?.data?.results && Array.isArray(body.data.results)) {
              // if server returned per-attendee results despite error, use them
              // otherwise keep generic
            }
            mergedResults = mergedResults.concat(chunkFailed);
            // surface but continue to allow user to see partial; stop remaining chunks on non-cancel chunk error
            toast.warning(`Batch ${idx + 1}/${totalChunks} failed: ${msg}`, { duration: 8000 });
            break;
          }

          const json = await res.json();
          const data = json?.data ?? json;
          const issued: number = Number(data?.issued ?? 0);
          const emailed: number = Number(data?.emailed ?? 0);
          const skipped: number = Number(data?.skipped ?? 0);
          const results: IssueResult[] = Array.isArray(data?.results) ? data.results : [];

          mergedIssued += Number.isFinite(issued) ? issued : 0;
          mergedEmailed += Number.isFinite(emailed) ? emailed : 0;
          mergedSkipped += Number.isFinite(skipped) ? skipped : results.filter((r) => r.skipped).length;
          mergedResults = mergedResults.concat(results);
          setIssueProgress({ current: idx + 1, total: totalChunks, processed: mergedResults.length, totalAttendees });
        } catch (err) {
          clearTimeout(timeoutId);
          if (cancelRequestedRef.current) break;
          const isAbort = err instanceof DOMException && err.name === "AbortError";
          const msg = isAbort ? "Chunk timed out — not sent, retryable" : err instanceof Error ? err.message : "Network error — not sent, retryable";
          hadChunkError = true;
          // mark this chunk's attendees as failed with retryable error
          const chunkFailed: IssueResult[] = chunk.map((_, i) => ({
            name: `Attendee ${i + 1}`,
            email: `attendee-${i + 1}`,
            success: false,
            emailed: false,
            skipped: false,
            error: msg,
          }));
          mergedResults = mergedResults.concat(chunkFailed);
          toast.warning(`Batch ${idx + 1}/${totalChunks} failed: ${msg}`, { duration: 8000 });
          break;
        } finally {
          abortRef.current = null;
        }
      }

      const finalSummary: IssueSummary = {
        issued: mergedIssued,
        emailed: mergedEmailed,
        skipped: mergedSkipped,
        results: mergedResults,
      };

      // if we processed less than total due to early break, keep results as-is
      setIssueSummary(finalSummary);
      setRefresh((n) => n + 1);

      // keep remaining selection if we sliced first 200
      if (remaining > 0) {
        setSelectedAttendeeIds((prev) => prev.slice(MAX_BATCH));
        toast.warning(`${mergedEmailed} emailed, ${mergedSkipped} skipped, ${mergedResults.filter((r) => !r.success && !r.skipped).length} failed — ${remaining} remaining not processed. Run again for next batch.`, { duration: 8000 });
      } else {
        setSelectedAttendeeIds([]);
        const failed = mergedResults.filter((r) => !r.success && !r.skipped).length;
        const skippedCount = mergedResults.filter((r) => r.skipped).length;
        if (failed > 0) {
          toast.warning(`${mergedEmailed} emailed, ${skippedCount} skipped, ${failed} failed`, { duration: 8000 });
        } else if (hadChunkError) {
          toast.warning(`${mergedEmailed} emailed, ${skippedCount} skipped`, { duration: 8000 });
        } else {
          toast.success(`${mergedEmailed} emailed${skippedCount ? `, ${skippedCount} skipped` : ""}`, { duration: 8000 });
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start certificate issuance");
    } finally {
      setIssueBusy(false);
      setIssueProgress(null);
      abortRef.current = null;
    }
  }

  function handleCancelIssue() {
    cancelRequestedRef.current = true;
    abortRef.current?.abort();
    toast.info("Cancelling — keeping completed batches");
  }

  async function handleRevokeExpired() {
    setRevokeBusy(true);
    try {
      const res = await authFetch(`/api/events/${event.id}/revoke-expired`, {
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
    setIssueBusy(true);
    try {
      const res = await authFetch(`/api/events/${event.id}/reissue`, {
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
      setIssueBusy(false);
    }
  }

  function getIssueDialogDescription(): string {
    if (selectedAttendeeIds.length === 0) return "";
    const n = selectedAttendeeIds.length;
    const effective = Math.min(n, MAX_BATCH);
    const remaining = n > MAX_BATCH ? n - MAX_BATCH : 0;
    const chunks = Math.ceil(effective / BATCH_CHUNK);
    const estSec = chunks * 15;
    const estText = estSec < 60 ? `~${estSec}s` : `~${Math.ceil(estSec / 60)} min`;
    if (n > MAX_BATCH) {
      return `You've selected ${n} attendees. Only the first ${MAX_BATCH} will be issued in this batch (equivalent to Select All when not choosing meticulously). Remaining ${remaining} can be issued in the next batch. This batch will run as ${chunks} chunk(s) of ${BATCH_CHUNK} — estimated ${estText}. Already issued attendees will be skipped. Failures are quick-fail and listed for retry.`;
    }
    return `This will issue certificates for ${effective} attendee(s) in ${chunks} chunk(s) of ${BATCH_CHUNK} — estimated ${estText}. Already issued attendees will be shown as Skipped. Attendees are only marked issued after email is sent, so you can safely retry failed ones.`;
  }

  function downloadCsv() {
    if (!issueSummary) return;
    const header = "Name,Email,Issued,Emailed,Skipped,Error\n";
    const rows = (issueSummary.results ?? []).map((r) =>
      [
        `"${r.name}"`,
        `"${r.email}"`,
        r.success ? "Yes" : "No",
        r.emailed ? "Yes" : r.success ? "No" : "N/A",
        r.skipped ? "Yes" : "No",
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
    const pct = issueProgress && issueProgress.total > 0 ? Math.round((issueProgress.current / issueProgress.total) * 100) : 0;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 shadow-lg min-w-[340px] max-w-[90vw]">
          <Loader2Icon className="size-10 animate-spin text-brand-600" />
          <div className="text-center w-full">
            <p className="text-lg font-semibold">Issuing certificates...</p>
            <p className="text-sm text-muted-foreground">Please do not close or navigate away.</p>
            {issueProgress && (
              <div className="mt-4 space-y-2">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Batch {issueProgress.current}/{issueProgress.total} — {issueProgress.processed} of {issueProgress.totalAttendees} processed
                </p>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleCancelIssue}>
            Cancel
          </Button>
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
                {issueSummary.emailed} emailed
                {(issueSummary.skipped ?? 0) > 0 && `, ${issueSummary.skipped} skipped`}
                {(issueSummary.results ?? []).filter((r) => !r.success && !r.skipped).length > 0 &&
                  `, ${(issueSummary.results ?? []).filter((r) => !r.success && !r.skipped).length} failed`}
                {(issueSummary.results ?? []).filter((r) => r.skipped).length === 0 &&
                  (issueSummary.results ?? []).filter((r) => !r.success && !r.skipped).length === 0 &&
                  `, ${issueSummary.issued} issued`}
              </p>

              {(issueSummary.results ?? []).some((r) => r.skipped) && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-[var(--color-info-text)] opacity-70">Skipped — already issued:</p>
                  {(issueSummary.results ?? []).filter((r) => r.skipped).map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[var(--color-info-text)] opacity-80">
                      <XCircleIcon className="size-3 shrink-0 text-amber-500" />
                      <span className="truncate">{r.email}</span>
                      <span className="shrink-0 opacity-60">— {r.error}</span>
                    </div>
                  ))}
                </div>
              )}

              {(issueSummary.results ?? []).some((r) => !r.success && !r.skipped) && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-[var(--color-info-text)] opacity-70">Failed — not emailed (retryable):</p>
                  {(issueSummary.results ?? []).filter((r) => !r.success && !r.skipped).map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[var(--color-info-text)] opacity-80">
                      <XCircleIcon className="size-3 shrink-0 text-red-500" />
                      <span className="truncate">{r.email}</span>
                      <span className="shrink-0 opacity-60">— {r.error}</span>
                    </div>
                  ))}
                </div>
              )}

              {(issueSummary.results ?? []).some((r) => r.success && r.emailed) && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-[var(--color-info-text)] opacity-70">Emailed:</p>
                  {(issueSummary.results ?? []).filter((r) => r.success && r.emailed).map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[var(--color-info-text)] opacity-80">
                      <CheckCircle2Icon className="size-3 shrink-0 text-green-600" />
                      <span className="truncate">{r.email}</span>
                    </div>
                  ))}
                </div>
              )}

              {(issueSummary.results ?? []).some((r) => r.success && !r.emailed) && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-[var(--color-info-text)] opacity-70">Issued (no email):</p>
                  {(issueSummary.results ?? []).filter((r) => r.success && !r.emailed).map((r, i) => (
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
              : `Issue Certificate${selectedAttendeeIds.length > MAX_BATCH ? ` (first ${MAX_BATCH} of ${selectedAttendeeIds.length})` : ""}`}
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
