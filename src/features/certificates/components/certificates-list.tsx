"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { certificatesApi } from "@/lib/api/certificates";
import type { CertificateWithEvent } from "@/lib/api/certificates";
import { eventsApi } from "@/lib/api/events";
import type { Event } from "@/types/event";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Paginator } from "@/components/ui/paginator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchIcon,
  Trash2Icon,
  ShieldIcon,
  UploadIcon,
  SparklesIcon,
} from "lucide-react";

type StatusFilter = "all" | "active" | "revoked" | "expired";
type SourceFilter = "all" | "uploaded" | "system-generated";

interface CertificatesListProps {
  initialQuery?: string;
  isCertAdmin?: boolean;
}

interface EventGroup {
  key: string;
  name: string;
  isPrivate: boolean;
  items: CertificateWithEvent[];
}

const PAGE_SIZE_DEFAULT = 10;
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS: Array<{ value: Exclude<StatusFilter, "all">; label: string }> = [
  { value: "active", label: "Active" },
  { value: "revoked", label: "Revoked" },
  { value: "expired", label: "Expired" },
];

const SOURCE_OPTIONS: Array<{ value: Exclude<SourceFilter, "all">; label: string }> = [
  { value: "uploaded", label: "Uploaded" },
  { value: "system-generated", label: "System-generated" },
];

function displayStatus(cert: CertificateWithEvent): Exclude<StatusFilter, "all"> {
  if (cert.revoked_at) return "revoked";
  if (cert.expires_at && new Date(cert.expires_at).getTime() < Date.now()) return "expired";
  return "active";
}

function displaySource(cert: CertificateWithEvent): Exclude<SourceFilter, "all"> {
  // Backend contract (CertificateSource::resolve): generation_mode=file →
  // uploaded, anything else → system-generated. Fall back to the legacy
  // file_path heuristic only when generation_mode is absent (e.g. stale cache).
  if (cert.generation_mode === "file") return "uploaded";
  if (cert.generation_mode === "template") return "system-generated";
  return cert.file_path && cert.file_path.trim() !== "" ? "uploaded" : "system-generated";
}

function eventNameOf(cert: CertificateWithEvent): string {
  return cert.event?.name ?? cert.events?.name ?? "No event";
}

function eventIsPrivate(cert: CertificateWithEvent): boolean {
  return cert.event ? !cert.event.is_public : false;
}

function groupByEvent(items: CertificateWithEvent[]): EventGroup[] {
  const map = new Map<string, EventGroup>();
  for (const cert of items) {
    const key = cert.event_id ?? "none";
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        name: eventNameOf(cert),
        isPrivate: eventIsPrivate(cert),
        items: [],
      };
      map.set(key, group);
    }
    group.items.push(cert);
  }
  // "No event" group sorts last.
  return [...map.values()].sort((a, b) =>
    a.key === "none" ? 1 : b.key === "none" ? -1 : 0
  );
}

export default function CertificatesList({
  initialQuery = "",
  isCertAdmin = false,
}: CertificatesListProps) {
  const [certificates, setCertificates] = useState<CertificateWithEvent[]>([]);
  const [metaTotal, setMetaTotal] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [expiredTotal, setExpiredTotal] = useState(0);

  const [searchInput, setSearchInput] = useState(initialQuery);
  const debouncedSearchRef = useRef(initialQuery);
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CertificateWithEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [certRevokeDialogOpen, setCertRevokeDialogOpen] = useState(false);
  const [certRevokeTarget, setCertRevokeTarget] = useState<CertificateWithEvent | null>(null);
  const [certRevokeReason, setCertRevokeReason] = useState("");
  const [certRevoking, setCertRevoking] = useState(false);
  const [certRevokeError, setCertRevokeError] = useState<string | null>(null);

  async function fetchExpiredTotal() {
    if (!isCertAdmin) return;
    try {
      const res = await certificatesApi.listPaged({ status: "expired", limit: 1 });
      setExpiredTotal(res.meta?.total ?? 0);
    } catch {
      // Non-critical; button stays hidden.
    }
  }

  async function reload() {
    try {
      const result = await certificatesApi.listPaged({
        search: searchInput.trim() || undefined,
        event_id: eventFilter !== "all" ? eventFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        source: sourceFilter !== "all" ? sourceFilter : undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      setCertificates(result.data ?? []);
      setMetaTotal(result.meta?.total ?? result.data?.length ?? 0);
    } catch {
      setLoadError("Failed to load certificates.");
    }
    await fetchExpiredTotal();
  }

  // Debounced server fetch (300ms for typing, immediate otherwise).
  useEffect(() => {
    let active = true;
    const timer = setTimeout(
      () => {
        setIsFetching(true);
        certificatesApi
          .listPaged({
            search: searchInput.trim() || undefined,
            event_id: eventFilter !== "all" ? eventFilter : undefined,
            status: statusFilter !== "all" ? statusFilter : undefined,
            source: sourceFilter !== "all" ? sourceFilter : undefined,
            limit: pageSize,
            offset: page * pageSize,
          })
          .then((result) => {
            if (!active) return;
            setCertificates(result.data ?? []);
            setMetaTotal(result.meta?.total ?? result.data?.length ?? 0);
            setLoadError(null);
            setIsFetching(false);
          })
          .catch(() => {
            if (!active) return;
            setLoadError("Failed to load certificates.");
            setIsFetching(false);
          });
      },
      searchInput !== debouncedSearchRef.current ? SEARCH_DEBOUNCE_MS : 0
    );
    debouncedSearchRef.current = searchInput;
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchInput, eventFilter, statusFilter, sourceFilter, page, pageSize]);

  // Visible-events filter options + expired badge count.
  useEffect(() => {
    let active = true;
    eventsApi
      .list({ limit: 100 })
      .then((result) => {
        if (active) setEvents(result.data ?? []);
      })
      .catch(() => {
        // Filter dropdown is non-critical; hide it on failure.
      })
      .finally(() => {
        if (active) void fetchExpiredTotal();
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCertAdmin]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await certificatesApi.delete(deleteTarget.id);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      if (displayedItems.length <= 1 && page > 0) {
        // Deleted the last row on this page — step back, effect refetches.
        setPage(page - 1);
      } else {
        await reload();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as { error?: string }).error ?? err.message : "Failed to delete certificate";
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  }

  const openDeleteDialog = (cert: CertificateWithEvent) => {
    setDeleteTarget(cert);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    setDeleteError(null);
  };

  function openCertRevokeDialog(cert: CertificateWithEvent) {
    setCertRevokeTarget(cert);
    setCertRevokeReason("");
    setCertRevokeError(null);
    setCertRevokeDialogOpen(true);
  }

  function closeCertRevokeDialog() {
    setCertRevokeDialogOpen(false);
    setCertRevokeTarget(null);
    setCertRevokeReason("");
    setCertRevokeError(null);
  }

  async function handleCertRevoke() {
    if (!certRevokeTarget || !certRevokeReason.trim()) return;
    setCertRevoking(true);
    setCertRevokeError(null);
    try {
      const res = await certificatesApi.revoke(
        certRevokeTarget.id,
        certRevokeReason.trim()
      );
      const updated = (res as { data?: CertificateWithEvent })?.data;
      setCertificates((prev) =>
        prev.map((c) =>
          c.id === certRevokeTarget.id
            ? {
                ...c,
                revoked_at: updated?.revoked_at ?? new Date().toISOString(),
                revoke_reason: certRevokeReason.trim(),
              }
            : c
        )
      );
      closeCertRevokeDialog();
      await fetchExpiredTotal();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Failed to revoke certificate";
      setCertRevokeError(msg);
    } finally {
      setCertRevoking(false);
    }
  }

  async function handleRevokeExpired() {
    setRevoking(true);
    setRevokeError(null);
    try {
      const res = await certificatesApi.expireAll();
      const revoked = res.data?.revoked ?? 0;
      setRevokeDialogOpen(false);
      if (revoked > 0) {
        await reload();
      } else {
        await fetchExpiredTotal();
      }
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : "Failed to revoke expired certificates");
    } finally {
      setRevoking(false);
    }
  }

  const openRevokeDialog = () => {
    setRevokeError(null);
    setRevokeDialogOpen(true);
  };

  const closeRevokeDialog = () => {
    setRevokeDialogOpen(false);
    setRevokeError(null);
  };

  // Safety net: the server filters by ?source= when supported, but an older
  // backend silently ignores it. Re-applying the same predicate client-side
  // is a no-op on filtered data and keeps pills truthful otherwise. Note:
  // meta.total still reflects the server count, so pages may look sparse on
  // backends without source support.
  const displayedItems =
    sourceFilter === "all"
      ? certificates
      : certificates.filter((c) => displaySource(c) === sourceFilter);
  const groups = useMemo(() => groupByEvent(displayedItems), [displayedItems]);

  const totalPages = Math.max(1, Math.ceil(metaTotal / pageSize));
  const totalItems = metaTotal;

  const filterEvents: Event[] = events;

  const showInitialLoading = isFetching && displayedItems.length === 0 && certificates.length === 0 && !loadError;
  const showEmpty =
    !isFetching && !loadError && displayedItems.length === 0;

  function renderRow(cert: CertificateWithEvent) {
    const status = displayStatus(cert);
    const source = displaySource(cert);
    return (
      <div
        key={cert.id}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        <div className="min-w-0 flex-1">
          <Link
            href={`/certificates/${cert.id}`}
            className="font-medium text-[var(--color-text)] hover:underline"
          >
            {cert.recipient_name}
          </Link>
          <p className="mt-0.5 truncate text-xs text-tertiary">
            <span className="font-mono">{cert.certificate_number}</span>
            {" · "}
            {cert.recipient_email || "—"}
            {" · "}
            Issued {new Date(cert.issued_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap shrink-0 items-center gap-2 sm:gap-3">
          {source === "uploaded" ? (
            <span className="status-pill" title="Uploaded certificate file">
              <UploadIcon className="size-3" />
              Uploaded
            </span>
          ) : (
            <span className="status-pill" title="System-generated from template">
              <SparklesIcon className="size-3" />
              System-generated
            </span>
          )}
          {status === "revoked" ? (
            <span className="status-pill status-revoked">Revoked</span>
          ) : status === "expired" ? (
            <span className="status-pill status-revoked">Expired</span>
          ) : (
            <span className="status-pill status-active">Active</span>
          )}
          <Link href={`/certificates/${cert.id}`} className="btn-disclosure">
            View
          </Link>
          {isCertAdmin && status === "active" ? (
            <button
              onClick={() => openCertRevokeDialog(cert)}
              className="btn-icon"
              title="Revoke certificate"
            >
              <ShieldIcon className="size-4" />
            </button>
          ) : null}
          {isCertAdmin && status === "revoked" ? (
            <button
              onClick={() => openDeleteDialog(cert)}
              className="btn-icon btn-icon-danger"
              title="Delete certificate"
            >
              <Trash2Icon className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {isCertAdmin && expiredTotal > 0 && (
          <button
            type="button"
            onClick={openRevokeDialog}
            className="btn bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40"
          >
            <ShieldIcon className="size-4" />
            Revoke Expired ({expiredTotal})
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-tertiary" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Search by recipient, email, or number..."
            className="input pl-8 py-1.5 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterEvents.length > 0 ? (
            <Select
              value={eventFilter}
              onValueChange={(value) => {
                setEventFilter(value ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue>
                  {(value: string) =>
                    value === "all"
                      ? "All events"
                      : value === "none"
                        ? "No event"
                        : (filterEvents.find((e) => e.id === value)?.name ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="none">No event</SelectItem>
                {filterEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                    {!event.is_public ? " (Private)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {STATUS_OPTIONS.map((opt) => {
            const active = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setStatusFilter(active ? "all" : opt.value);
                  setPage(0);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white"
                    : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-tertiary hover:border-[var(--color-brand-300)]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
          <span className="mx-1 hidden h-4 w-px bg-[var(--color-border)] sm:inline-block" aria-hidden="true" />
          {SOURCE_OPTIONS.map((opt) => {
            const active = sourceFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSourceFilter(active ? "all" : opt.value);
                  setPage(0);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white"
                    : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-tertiary hover:border-[var(--color-brand-300)]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
          {(statusFilter !== "all" || sourceFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setSourceFilter("all");
                setPage(0);
              }}
              className="text-xs text-tertiary hover:text-secondary cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
          {loadError}
        </div>
      )}

      {showInitialLoading ? (
        <div className="app-card p-12 text-center">
          <p className="text-sm text-tertiary">Loading certificates...</p>
        </div>
      ) : null}

      {showEmpty && (
        <div className="app-card p-12 text-center">
          <p className="text-sm text-tertiary">
            {searchInput || statusFilter !== "all" || sourceFilter !== "all" || eventFilter !== "all"
              ? "No certificates match your filters."
              : "No certificates found."}
          </p>
        </div>
      )}

      {!showInitialLoading && !showEmpty && (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.key} className="app-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-[var(--color-surface-secondary)] px-4 py-2.5">
                <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                  {group.name}
                  {group.isPrivate ? (
                    <span className="status-pill ml-2">Private</span>
                  ) : null}
                </p>
                <p className="shrink-0 text-xs text-tertiary tabular-nums">
                  {group.items.length} certificate{group.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="divide-y divide-border">
                {group.items.map(renderRow)}
              </div>
            </div>
          ))}
        </div>
      )}

      <Paginator
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        setPage={setPage}
        setPageSize={(s) => {
          setPageSize(s);
          setPage(0);
        }}
      />

      {/* Delete Confirmation Dialog (certificate only — attendee kept) */}
      <Dialog open={deleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Certificate</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <strong>
                {deleteTarget?.certificate_number ?? "this certificate"}
              </strong>
              . The attendee roster entry is kept — only the certificate is removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
              <Trash2Icon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
              <p className="text-[var(--color-danger-text)]">
                This cannot be undone. The certificate will be permanently removed.
              </p>
            </div>
          </div>
          {deleteError && (
            <p className="text-xs text-[var(--color-danger-text)]">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog (marks revoked — does NOT delete) */}
      <Dialog open={certRevokeDialogOpen} onOpenChange={closeCertRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Certificate</DialogTitle>
            <DialogDescription>
              This will mark{" "}
              <strong>
                {certRevokeTarget?.certificate_number ?? "this certificate"}
              </strong>{" "}
              as revoked. The certificate record is kept — it is not deleted.
              A reason is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="revoke-reason" className="block text-sm font-medium">
                Reason *
              </label>
              <textarea
                id="revoke-reason"
                value={certRevokeReason}
                onChange={(e) => setCertRevokeReason(e.target.value)}
                required
                rows={3}
                placeholder="e.g. Issued with incorrect recipient name"
                className="input mt-1"
              />
            </div>
          </div>
          {certRevokeError && (
            <p className="text-xs text-[var(--color-danger-text)]">
              {certRevokeError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeCertRevokeDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCertRevoke}
              disabled={certRevoking || !certRevokeReason.trim()}
            >
              {certRevoking ? "Revoking..." : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Expired Confirmation Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={closeRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Expired Certificates</DialogTitle>
            <DialogDescription>
              Are you sure? This will revoke all expired certificates across all events.
              Attendees will need to be re-issued if they still need a certificate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
              <ShieldIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
              <p className="text-[var(--color-danger-text)]">
                This cannot be undone. All expired certificates will be marked as revoked.
              </p>
            </div>
          </div>
          {revokeError && (
            <p className="text-xs text-[var(--color-danger-text)]">
              {revokeError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeRevokeDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeExpired}
              disabled={revoking}
            >
              {revoking ? "Revoking..." : "Revoke Expired"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
