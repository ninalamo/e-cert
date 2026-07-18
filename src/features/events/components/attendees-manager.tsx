"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  getAttendeesAction,
  addAttendeeAction,
  updateAttendeeAction,
  removeAttendeeAction,
} from "@/features/events/server/attendee.actions";
import type { EventAttendee } from "@/types/event-attendee";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2Icon, InfoIcon, SearchIcon } from "lucide-react";

const PAGE_SIZE = 25;

type FilterStatus = "all" | "pending" | "attended" | "completed" | "issued";

export default function AttendeesManager({
  eventId,
  organizationId,
  readOnly = false,
  onSelectionChange,
  showAddDialog = false,
  onAddDialogHandled,
}: {
  eventId: string;
  organizationId: string;
  readOnly?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  showAddDialog?: boolean;
  onAddDialogHandled?: () => void;
}) {
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addFile, setAddFile] = useState<{ name: string; data: string; type: string } | null>(null);

  const [removeTarget, setRemoveTarget] = useState<EventAttendee | null>(null);

  const load = useCallback(async () => {
    const data = await getAttendeesAction(eventId);
    setAttendees(data);
    setLoading(false);
  }, [eventId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onSelectionChange?.(Array.from(selected));
  }, [selected, onSelectionChange]);

  useEffect(() => {
    if (showAddDialog) {
      setAddOpen(true);
      onAddDialogHandled?.();
    }
  }, [showAddDialog, onAddDialogHandled]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = useMemo(() => {
    let list = attendees;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
      );
    }
    if (filter !== "all") {
      list = list.filter((a) => {
        if (filter === "pending") return !a.attended && !a.completed && !a.certificate_id;
        if (filter === "attended") return a.attended && !a.certificate_id;
        if (filter === "completed") return a.completed && !a.certificate_id;
        if (filter === "issued") return !!a.certificate_id;
        return true;
      });
    }
    return list;
  }, [attendees, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const somePageSelected = pageRows.some((r) => selected.has(r.id));

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(0);
  }

  function handleFilterChange(value: FilterStatus) {
    setFilter(value);
    setPage(0);
  }

  function toggleSelectAll() {
    if (allPageSelected) {
      const next = new Set(selected);
      pageRows.forEach((r) => next.delete(r.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      pageRows.forEach((r) => next.add(r.id));
      setSelected(next);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    const result = await addAttendeeAction({
      event_id: eventId,
      organization_id: organizationId,
      name: addName,
      email: addEmail,
      file_path: addFile?.name || undefined,
    });
    setBusy(false);
    if (result.error) {
      setError(result.error);
    } else {
      setAddName("");
      setAddEmail("");
      setAddFile(null);
      setAddOpen(false);
      await load();
      setMessage("Attendee added.");
    }
  }

  async function toggleField(id: string, field: "attended" | "completed", value: boolean) {
    setError(null);
    const result = await updateAttendeeAction(id, { [field]: value });
    if (result.error) {
      setError(result.error);
    } else if (result.attendee) {
      setAttendees((prev) => prev.map((a) => (a.id === id ? result.attendee! : a)));
    }
  }

  async function handleRemove(id: string) {
    setRemoveTarget(null);
    const result = await removeAttendeeAction(id);
    if (result.error) {
      setError(result.error);
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await load();
    }
  }

  async function bulkToggle(field: "attended" | "completed", value: boolean) {
    setError(null);
    const ids = Array.from(selected);
    for (const id of ids) {
      const result = await updateAttendeeAction(id, { [field]: value });
      if (result.attendee) {
        setAttendees((prev) => prev.map((a) => (a.id === id ? result.attendee! : a)));
      }
    }
    setSelected(new Set());
  }

  const completedCount = attendees.filter((a) => a.completed && !a.certificate_id).length;

  if (loading) {
    return (
      <div className="app-card p-12 text-center">
        <p className="text-sm text-tertiary">Loading attendees...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-success-text)]" />
          <p className="text-[var(--color-success-text)]">{message}</p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
          <p className="text-[var(--color-danger-text)]">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-tertiary">
            {filtered.length} attendee{filtered.length !== 1 ? "s" : ""}
          </span>
          {completedCount > 0 && (
            <span className="badge-amber">{completedCount} pending issue</span>
          )}
          {selected.size > 0 && (
            <span className="badge-brand">{selected.size} selected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search name or email..."
              className="input pl-8 py-1.5 text-xs w-48"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value as FilterStatus)}
            className="input py-1.5 text-xs w-auto"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="attended">Attended</option>
            <option value="completed">Completed</option>
            <option value="issued">Issued</option>
          </select>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <span className="text-xs text-[var(--color-text-muted)] mr-1">{selected.size} selected</span>
          <button
            type="button"
            onClick={() => bulkToggle("attended", true)}
            className="btn-brand-soft text-xs"
          >
            Mark Attended
          </button>
          <button
            type="button"
            onClick={() => bulkToggle("attended", false)}
            className="btn-brand-soft text-xs"
          >
            Unmark Attended
          </button>
          <button
            type="button"
            onClick={() => bulkToggle("completed", true)}
            className="btn-brand-soft text-xs"
          >
            Mark Done
          </button>
          <button
            type="button"
            onClick={() => bulkToggle("completed", false)}
            className="btn-brand-soft text-xs"
          >
            Unmark Done
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] ml-auto cursor-pointer"
          >
            Clear selection
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="app-card p-12 text-center">
          <p className="text-sm text-tertiary">
            {attendees.length === 0 ? "No attendees yet." : "No matches found."}
          </p>
        </div>
      ) : (
        <>
          <div className="app-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {!readOnly && (
                    <th className="w-12 py-3 pl-4 text-left">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = somePageSelected && !allPageSelected;
                        }}
                        onChange={toggleSelectAll}
                        className="size-4 rounded border-border-strong accent-[var(--color-brand-600)]"
                      />
                    </th>
                  )}
                  <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Name</th>
                  <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider hidden md:table-cell">Status</th>
                  {!readOnly && (
                    <th className="py-3 pr-4 text-right text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((a, idx) => (
                  <tr
                    key={a.id}
                    className={`border-b border-[var(--color-border)] last:border-b-0 transition-colors hover:bg-[var(--color-surface-hover)] ${idx === 0 ? "" : ""}`}
                  >
                    {!readOnly && (
                      <td className="w-12 py-3 pl-4">
                        <input
                          type="checkbox"
                          checked={selected.has(a.id)}
                          onChange={() => toggleSelect(a.id)}
                          className="size-4 rounded border-border-strong accent-[var(--color-brand-600)]"
                        />
                      </td>
                    )}
                    <td className="py-3 px-2">
                      <p className="font-medium text-[var(--color-text)]">{a.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)] sm:hidden">{a.email}</p>
                    </td>
                    <td className="py-3 px-2 text-[var(--color-text-muted)] hidden sm:table-cell">{a.email}</td>
                    <td className="py-3 px-2 hidden md:table-cell">
                      {a.certificate_id ? (
                        <Link
                          href={`/certificates/${a.certificate_id}`}
                          className="badge-blue"
                        >
                          Issued
                        </Link>
                      ) : a.completed ? (
                        <span className="badge-amber">Pending</span>
                      ) : a.attended ? (
                        <span className="badge-emerald">Attended</span>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">—</span>
                      )}
                    </td>
                    {!readOnly && (
                      <td className="py-3 pr-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={a.attended}
                              onClick={() => toggleField(a.id, "attended", !a.attended)}
                              title="Attended"
                              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                                a.attended ? "bg-[var(--color-success)]" : "bg-[var(--color-border-strong)]"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                                  a.attended ? "translate-x-5" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                            <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">Attended</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={a.completed}
                              onClick={() => toggleField(a.id, "completed", !a.completed)}
                              title="Completed"
                              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                                a.completed ? "bg-[var(--color-success)]" : "bg-[var(--color-border-strong)]"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                                  a.completed ? "translate-x-5" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                            <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">Done</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRemoveTarget(a)}
                            className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger-text)]"
                          >
                            <Trash2Icon className="size-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="rounded border px-3 py-1 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`rounded border px-3 py-1 text-sm ${
                    i === safePage ? "bg-brand-600 text-white" : "hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="rounded border px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Attendee</DialogTitle>
            <DialogDescription>
              Add a participant to this event.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label htmlFor="add-name" className="block text-sm font-medium">
                Name *
              </label>
              <input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                required
                className="input mt-1"
              />
            </div>
            <div>
              <label htmlFor="add-email" className="block text-sm font-medium">
                Email *
              </label>
              <input
                id="add-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                required
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Certificate File <span className="text-tertiary">(optional)</span>
              </label>
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-sm transition-colors cursor-pointer ${
                  addFile
                    ? "border-[var(--color-success-border)] bg-[var(--color-success-bg)]"
                    : "border-border hover:border-border-strong hover:bg-surface-hover"
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const base64 = (ev.target?.result as string).split(",")[1] ?? "";
                      setAddFile({ name: file.name, data: base64, type: file.type });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {addFile ? (
                  <>
                    <span className="text-[var(--color-success-text)] font-medium">{addFile.name}</span>
                    <button
                      type="button"
                      onClick={(ev) => { ev.preventDefault(); setAddFile(null); }}
                      className="text-xs text-danger underline"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span className="text-tertiary">Tap to upload PDF, PNG, or JPG</span>
                )}
              </label>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Adding..." : "Add Attendee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Attendee</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{removeTarget?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeTarget && handleRemove(removeTarget.id)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
