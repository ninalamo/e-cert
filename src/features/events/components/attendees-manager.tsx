"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { attendeesApi } from "@/lib/api/attendees";
import type { EventAttendee } from "@/types/event-attendee";
import type { PaginationMeta } from "@/lib/api/types";
import { Paginator } from "@/components/ui/paginator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2Icon, PencilIcon, InfoIcon, SearchIcon, EyeIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB
const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 25;

type FilterStatus = "all" | "not_issued" | "issued" | "revoked" | "expired";

export default function AttendeesManager({
  eventId,
  organizationId,
  readOnly = false,
  isAdmin = false,
  onSelectionChange,
  showAddDialog = false,
  onAddDialogHandled,
  refreshTrigger = 0,
}: {
  eventId: string;
  organizationId: string;
  readOnly?: boolean;
  isAdmin?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  showAddDialog?: boolean;
  onAddDialogHandled?: () => void;
  refreshTrigger?: number;
}) {
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);
  const debouncedSearchRef = useRef(debouncedSearch);
  const filterRef = useRef(filter);
  useEffect(() => { pageRef.current = page; });
  useEffect(() => { pageSizeRef.current = pageSize; });
  useEffect(() => { debouncedSearchRef.current = debouncedSearch; });
  useEffect(() => { filterRef.current = filter; });

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addMode, setAddMode] = useState<"template" | "file">("template");
  const [addFile, setAddFile] = useState<{ name: string; data: string; type: string } | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EventAttendee | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMode, setEditMode] = useState<"template" | "file">("template");
  const [editFile, setEditFile] = useState<{ name: string; data: string; type: string } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [removeTarget, setRemoveTarget] = useState<EventAttendee | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [deletePreview, setDeletePreview] = useState<{
    has_certificate: boolean;
    certificate_number: string | null;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchPage = useCallback(async (p: number, ps: number, search: string, status?: FilterStatus) => {
    setFetching(true);
    try {
      const result = await attendeesApi.list(eventId, {
        search: search.trim() || undefined,
        status: status && status !== "all" ? status : undefined,
        limit: ps,
        offset: p * ps,
      });
      setAttendees(result.data ?? []);
      setMeta(result.meta);
    } finally {
      setFetching(false);
    }
  }, [eventId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(false);
    setFetching(true);
    attendeesApi
      .list(eventId, {
        search: debouncedSearch.trim() || undefined,
        status: filter !== "all" ? filter : undefined,
        limit: pageSize,
        offset: page * pageSize,
      })
      .then((result) => {
        if (cancelled) return;
        setAttendees(result.data ?? []);
        setMeta(result.meta);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => { cancelled = true; };
  }, [eventId, page, pageSize, debouncedSearch, filter]);

  useEffect(() => {
    onSelectionChange?.(Array.from(selected));
  }, [selected, onSelectionChange]);

  useEffect(() => {
    if (refreshTrigger <= 0) return;
    let cancelled = false;
    setFetching(true);
    const search = debouncedSearchRef.current.trim() || undefined;
    const status = filterRef.current !== "all" ? filterRef.current : undefined;
    attendeesApi
      .list(eventId, {
        search,
        status,
        limit: pageSizeRef.current,
        offset: pageRef.current * pageSizeRef.current,
      })
      .then((result) => {
        if (cancelled) return;
        setAttendees(result.data ?? []);
        setMeta(result.meta);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  useEffect(() => {
    if (showAddDialog) {
      setAddOpen(true);
      onAddDialogHandled?.();
    }
  }, [showAddDialog, onAddDialogHandled]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const pageRows = attendees;
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / pageSize)) : 1;

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const somePageSelected = pageRows.some((r) => selected.has(r.id));

  function handleSearchChange(value: string) {
    setSearchInput(value);
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
    const { data: result } = await attendeesApi.add(eventId, {
      organization_id: organizationId,
      name: addName,
      email: addEmail,
      metadata: addMode === "file" && addFile ? {
        generation_mode: "file",
        file_data: addFile.data,
        file_name: addFile.name,
        file_type: addFile.type,
      } : { generation_mode: "template" },
    });
    setBusy(false);
    if (!result) {
      setError("Failed to add attendee");
    } else {
      setAddName("");
      setAddEmail("");
      setAddMode("template");
      setAddFile(null);
      setAddOpen(false);
      await fetchPage(page, pageSize, debouncedSearch);
      setMessage("Attendee added.");
    }
  }

  function openEdit(a: EventAttendee) {
    setEditTarget(a);
    setEditName(a.name);
    setEditEmail(a.email);
    setEditMode(a.metadata?.generation_mode === "file" ? "file" : "template");
    setEditFile(null);
    setEditError(null);
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setError(null);
    setMessage(null);
    setBusy(true);

    const metadata: Record<string, unknown> = { generation_mode: editMode };
    if (editMode === "file" && editFile) {
      metadata.file_data = editFile.data;
      metadata.file_name = editFile.name;
      metadata.file_type = editFile.type;
    } else if (editMode === "file" && !editFile) {
      const { data: fileData } = await attendeesApi.getFileData(eventId, editTarget.id);
      metadata.file_data = fileData?.file_data ?? null;
      metadata.file_name = fileData?.file_name ?? null;
      metadata.file_type = fileData?.file_type ?? null;
    } else if (editMode === "template") {
      metadata.file_data = null;
      metadata.file_name = null;
      metadata.file_type = null;
    }

    const { data: result } = await attendeesApi.update(eventId, editTarget.id, {
      name: editName,
      email: editEmail,
      metadata,
    });
    setBusy(false);
    if (!result) {
      setEditError("Failed to update attendee");
    } else {
      setEditName("");
      setEditEmail("");
      setEditMode("template");
      setEditFile(null);
      setEditTarget(null);
      setEditOpen(false);
      await fetchPage(page, pageSize, debouncedSearch);
      setMessage("Attendee updated.");
    }
  }

  async function handleRemove(id: string) {
    setRemoveBusy(true);
    const target = attendees.find((a) => a.id === id);
    const apiResult = isAdmin && target?.certificate_id
      ? await attendeesApi.removeWithCert(eventId, id)
      : await attendeesApi.remove(eventId, id);
    setRemoveBusy(false);
    setRemoveTarget(null);
    setDeletePreview(null);
    if (!apiResult) {
      setError("Failed to remove attendee");
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await fetchPage(page, pageSize, debouncedSearch);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-28" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="app-card overflow-hidden">
          <div className="divide-y divide-[var(--color-border)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="hidden h-4 w-20 sm:block" />
                <Skeleton className="ml-auto h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
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
            {meta?.total ?? 0} attendee{(meta?.total ?? 0) !== 1 ? "s" : ""}
          </span>
          {selected.size > 0 && (
            <span className="badge-brand">{selected.size} selected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-tertiary" />
            <input
              type="text"
              value={searchInput}
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
            <option value="not_issued">Not Issued</option>
            <option value="issued">Issued</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {(meta?.total ?? 0) > 0 && (
        <Paginator
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={meta?.total ?? 0}
          setPage={setPage}
          setPageSize={(s) => { setPageSize(s); setPage(0); }}
        />
      )}

      {attendees.length === 0 && !fetching ? (
        <div className="app-card p-12 text-center">
          <p className="text-sm text-tertiary">
            {(meta?.total ?? 0) === 0 && filter === "all" && !searchInput.trim()
              ? "No attendees yet."
              : "No matches found."}
          </p>
        </div>
      ) : (
        <div className="app-card overflow-hidden relative">
          {fetching && (
            <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-[1px]">
              <div className="divide-y divide-[var(--color-border)]">
                {Array.from({ length: Math.min(pageRows.length || 5, 10) }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <Skeleton className="size-4 rounded" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="hidden h-4 w-20 sm:block" />
                    <Skeleton className="ml-auto h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          )}
          <table className={`w-full text-sm ${fetching ? "opacity-40" : ""}`}>
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="w-12 py-3 pl-4 text-left">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    disabled={readOnly}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected && !allPageSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="size-4 rounded border-border-strong accent-[var(--color-brand-600)] disabled:opacity-50"
                  />
                </th>
                <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Name (Email)</th>
                <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Certificate Issue</th>
                <th className="py-3 text-left text-[0.6875rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider hidden sm:table-cell">Document Type</th>
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
                  <td className="w-12 py-3 pl-4">
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      disabled={readOnly}
                      onChange={() => toggleSelect(a.id)}
                      className="size-4 rounded border-border-strong accent-[var(--color-brand-600)] disabled:opacity-50"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <p className="font-medium text-[var(--color-text)]">{a.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">({a.email})</p>
                  </td>
                  <td className="py-3 px-2">
                    {a.certificate_id ? (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 text-xs font-medium text-[var(--color-success-text)]">Yes</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-surface-tertiary)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">No</span>
                    )}
                  </td>
                  <td className="py-3 px-2 hidden sm:table-cell">
                    {a.metadata?.generation_mode === "file" ? (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-brand-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-brand-700)]">Uploaded</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-surface-tertiary)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">System-Generated</span>
                    )}
                  </td>
                  {!readOnly && (
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {a.certificate_id && (
                          <Link
                            href={`/certificates/${a.certificate_id}?eventId=${eventId}`}
                            className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-brand-bg)] hover:text-[var(--color-brand-text)]"
                            title="View Certificate"
                          >
                            <EyeIcon className="size-4" />
                          </Link>
                        )}
                        {!a.certificate_id && (
                          <button
                            type="button"
                            onClick={() => openEdit(a)}
                            className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-brand-bg)] hover:text-[var(--color-brand-text)]"
                          >
                            <PencilIcon className="size-4" />
                          </button>
                        )}
                        {(isAdmin || !a.certificate_id) && (
                          <button
                            type="button"
                            onClick={async () => {
                              setRemoveTarget(a);
                              setPreviewLoading(true);
                              setDeletePreview(null);
                              const { data: preview } = await attendeesApi.getDeletePreview(eventId, a.id);
                              setDeletePreview(preview);
                              setPreviewLoading(false);
                            }}
                            title={a.certificate_id ? "This will also delete the issued certificate" : undefined}
                            className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger-text)]"
                          >
                            <Trash2Icon className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(meta?.total ?? 0) > 0 && (
        <Paginator
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={meta?.total ?? 0}
          setPage={setPage}
          setPageSize={(s) => { setPageSize(s); setPage(0); }}
        />
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
              <label className="block text-sm font-medium mb-2">
                Cert Option
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="add-mode"
                    value="template"
                    checked={addMode === "template"}
                    onChange={() => { setAddMode("template"); setAddFile(null); }}
                    className="accent-[var(--color-brand-600)]"
                  />
                  System Generated
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="add-mode"
                    value="file"
                    checked={addMode === "file"}
                    onChange={() => setAddMode("file")}
                    className="accent-[var(--color-brand-600)]"
                  />
                  Use Uploaded
                </label>
              </div>
            </div>
            {addMode === "file" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Certificate File
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
                      if (file.size > MAX_FILE_SIZE) {
                        setError("File exceeds 1 MB limit. Please choose a smaller file.");
                        e.target.value = "";
                        return;
                      }
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
            )}

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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendee</DialogTitle>
            <DialogDescription>
              Update participant details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4">
            {editError && (
              <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
                <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
                <p className="text-[var(--color-danger-text)]">{editError}</p>
              </div>
            )}
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium">
                Name *
              </label>
              <input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="input mt-1"
              />
            </div>
            <div>
              <label htmlFor="edit-email" className="block text-sm font-medium">
                Email *
              </label>
              <input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Cert Option
                {editTarget?.certificate_id && (
                  <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">(locked after issuance)</span>
                )}
              </label>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 text-sm ${editTarget?.certificate_id ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                  <input
                    type="radio"
                    name="edit-mode"
                    value="template"
                    checked={editMode === "template"}
                    onChange={() => { setEditMode("template"); setEditFile(null); }}
                    disabled={!!editTarget?.certificate_id}
                    className="accent-[var(--color-brand-600)]"
                  />
                  System Generated
                </label>
                <label className={`flex items-center gap-2 text-sm ${editTarget?.certificate_id ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                  <input
                    type="radio"
                    name="edit-mode"
                    value="file"
                    checked={editMode === "file"}
                    onChange={() => setEditMode("file")}
                    disabled={!!editTarget?.certificate_id}
                    className="accent-[var(--color-brand-600)]"
                  />
                  Use Uploaded
                </label>
              </div>
            </div>
            {editMode === "file" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Certificate File
                </label>
                {editTarget?.metadata?.file_name && !editFile && (
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-3 py-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-success-text)] shrink-0"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span className="text-xs font-medium text-[var(--color-success-text)] truncate">{editTarget.metadata.file_name}</span>
                    <span className="text-xs text-[var(--color-text-muted)] ml-auto shrink-0">Uploaded</span>
                  </div>
                )}
                {!editTarget?.certificate_id && (
                  <label
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-sm transition-colors cursor-pointer ${
                      editFile
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
                      if (file.size > MAX_FILE_SIZE) {
                        setEditError("File exceeds 1 MB limit. Please choose a smaller file.");
                        e.target.value = "";
                        return;
                      }
                      setEditError(null);
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const base64 = (ev.target?.result as string).split(",")[1] ?? "";
                        setEditFile({ name: file.name, data: base64, type: file.type });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  {editFile ? (
                    <>
                      <span className="text-[var(--color-success-text)] font-medium">{editFile.name}</span>
                      <button
                        type="button"
                        onClick={(ev) => { ev.preventDefault(); setEditFile(null); }}
                        className="text-xs text-danger underline"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <span className="text-tertiary">
                      {editTarget?.metadata?.file_name ? "Tap to replace with a new file" : "Tap to upload PDF, PNG, or JPG"}
                    </span>
                  )}
                </label>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeTarget} onOpenChange={(open) => { if (!open && !removeBusy) { setRemoveTarget(null); setDeletePreview(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Attendee</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{removeTarget?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          {previewLoading ? (
            <p className="text-sm text-[var(--color-text-muted)]">Checking what will be deleted...</p>
          ) : deletePreview ? (
            <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm space-y-1">
              <p className="font-medium text-[var(--color-danger-text)]">The following will be permanently deleted:</p>
              <ul className="list-disc list-inside text-[var(--color-danger-text)] opacity-80 space-y-0.5">
                <li>Attendee record</li>
                {deletePreview.has_certificate && <li>Issued certificate</li>}
                {deletePreview.has_certificate && (
                  <li>User account (no other event records found)</li>
                )}
              </ul>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={removeBusy} onClick={() => { setRemoveTarget(null); setDeletePreview(null); }}>
              {removeBusy ? "Please wait..." : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              disabled={previewLoading || removeBusy}
              onClick={() => removeTarget && handleRemove(removeTarget.id)}
            >
              {removeBusy
                ? "Removing..."
                : deletePreview?.has_certificate
                    ? "Delete Certificate & Remove"
                    : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
