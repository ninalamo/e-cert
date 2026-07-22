"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteEventAction } from "@/features/events/server/event.actions";
import type { Event } from "@/types/event";
import { PlusIcon, Trash2Icon, SearchIcon, InfoIcon } from "lucide-react";
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

const statusColors: Record<string, string> = {
  draft: "status-pill status-draft",
  active: "status-pill status-active",
  archive: "status-pill status-archive",
};

const STATUS_OPTIONS: { value: Event["status"]; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archive", label: "Archived" },
];

export default function EventsList({
  canDelete = true,
  events,
  total,
  page,
  totalPages,
  pageSize,
  search,
  statusFilter,
}: {
  canDelete?: boolean;
  events: Event[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  search: string;
  statusFilter: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(search);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeStatuses = statusFilter
    ? statusFilter.split(",").filter(Boolean)
    : [];

  function buildUrl(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    return `/events?${params.toString()}`;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildUrl({ q: query || undefined, page: undefined }));
  }

  function toggleStatus(value: Event["status"]) {
    const next = activeStatuses.includes(value)
      ? activeStatuses.filter((s) => s !== value)
      : [...activeStatuses, value];
    router.push(
      buildUrl({ status: next.length ? next.join(",") : undefined, page: undefined })
    );
  }

  function goToPage(p: number) {
    router.push(buildUrl({ page: p > 0 ? String(p + 1) : undefined }));
  }

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteEventAction(deleteTarget.id);
    setDeleting(false);
    if (result?.error) {
      alert(result.error);
    } else {
      setDeleteTarget(null);
      handleRefresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link href="/events/new" className="btn-brand">
          <PlusIcon className="size-4" />
          New Event
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative w-full sm:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events..."
            className="input pl-8 py-1.5 text-xs"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const active = activeStatuses.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleStatus(opt.value)}
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
          {activeStatuses.length > 0 && (
            <button
              type="button"
              onClick={() =>
                router.push(buildUrl({ status: undefined, page: undefined }))
              }
              className="text-xs text-tertiary hover:text-secondary cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {events.length === 0 && (
        <div className="app-card p-12 text-center">
          <p className="text-sm text-tertiary">
            {search || activeStatuses.length
              ? "No events match your filters."
              : "No events yet. Create your first one."}
          </p>
        </div>
      )}

      {events.length > 0 && (
        <div className="app-card divide-y divide-border overflow-hidden">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/events/${event.id}`}
                  className="font-medium text-[var(--color-text)] hover:underline"
                >
                  {event.name}
                </Link>
                <p className="mt-0.5 truncate text-xs text-tertiary">
                  {event.event_date
                    ? new Date(event.event_date).toLocaleDateString()
                    : "No date"}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={statusColors[event.status] ?? "status-pill status-draft"}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
                <Link href={`/events/${event.id}`} className="btn-disclosure">
                  View
                </Link>
                {canDelete && event.status !== "active" ? (
                  <button
                    onClick={() => setDeleteTarget(event)}
                    className="btn-icon btn-icon-danger"
                    title="Delete event"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                ) : (
                  <span
                    title={
                      canDelete
                        ? "Active events cannot be deleted"
                        : "Only admins can delete events"
                    }
                    className="btn-icon"
                    aria-disabled="true"
                  >
                    <Trash2Icon className="size-4" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Paginator
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={total}
        setPage={goToPage}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
            <p className="text-[var(--color-danger-text)]">
              This will permanently delete the event along with all associated
              attendees and their issued certificates. This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
