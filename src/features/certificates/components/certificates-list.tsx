"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ORG_ID } from "@/lib/org";
import { countExpired } from "@/lib/certificate-utils";
import { certificatesApi } from "@/lib/api/certificates";
import type { Certificate } from "@/types/certificate";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePagination, Paginator } from "@/components/ui/paginator";
import {
  SearchIcon,
  Trash2Icon,
  ShieldIcon,
} from "lucide-react";

interface CertificateWithEvent extends Certificate {
  events: { name: string } | null;
}

interface CertificatesListProps {
  initialCertificates: CertificateWithEvent[];
  initialQuery?: string;
  isAdmin?: boolean;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "revoked", label: "Revoked" },
];

export default function CertificatesList({
  initialCertificates,
  initialQuery = "",
  isAdmin = false,
}: CertificatesListProps) {
  const [certificates, setCertificates] = useState<CertificateWithEvent[]>(initialCertificates);
  const [search, setSearch] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CertificateWithEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  async function loadCertificates() {
    try {
      const result = await certificatesApi.listWithEvent(ORG_ID);
      return result.data ?? [];
    } catch {
      setLoadError("Failed to load certificates.");
      return [];
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await certificatesApi.delete(deleteTarget.id);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      const updated = await loadCertificates();
      if (updated.length > 0) {
        setCertificates(updated);
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

  async function handleRevokeExpired() {
    setRevoking(true);
    setRevokeError(null);
    try {
      const res = await fetch("/api/certificates/expire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const result = await res.json();
      setRevokeDialogOpen(false);
      if (result.revoked > 0) {
        const updated = await loadCertificates();
        if (updated.length > 0) {
          setCertificates(updated);
        }
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

  const filtered = useMemo(() => {
    return certificates.filter((c) => {
      const matchesSearch =
        !search ||
        c.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
        c.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
        c.certificate_number.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter.length === 0 ||
        statusFilter.some((s) =>
          s === "revoked" ? !!c.revoked_at : !c.revoked_at
        );

      return matchesSearch && matchesStatus;
    });
  }, [certificates, search, statusFilter]);

  const expiredCount = useMemo(() => countExpired(certificates), [certificates]);

  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } =
    usePagination(filtered, 10);

  function toggleStatus(value: string) {
    setStatusFilter((prev) =>
      prev.includes(value)
        ? prev.filter((s) => s !== value)
        : [...prev, value]
    );
    setPage(0);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {isAdmin && expiredCount > 0 && (
          <button
            type="button"
            onClick={openRevokeDialog}
            className="btn bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40"
          >
            <ShieldIcon className="size-4" />
            Revoke Expired ({expiredCount})
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient, email, or number..."
            className="input pl-8 py-1.5 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const active = statusFilter.includes(opt.value);
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
          {statusFilter.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter([]);
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

      {filtered.length === 0 && (
        <div className="app-card p-12 text-center">
          <p className="text-sm text-tertiary">
            {search || statusFilter.length > 0
              ? "No certificates match your filters."
              : "No certificates found."}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="app-card divide-y divide-border overflow-hidden">
          {paginatedItems.map((cert) => (
            <div
              key={cert.id}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)]"
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
                  {cert.events?.name ? ` · ${cert.events.name}` : ""}
                  {" · "}
                  Issued {new Date(cert.issued_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {cert.revoked_at ? (
                  <span className="status-pill status-revoked">Revoked</span>
                ) : (
                  <span className="status-pill status-active">Active</span>
                )}
                <Link href={`/certificates/${cert.id}`} className="btn-disclosure">
                  View
                </Link>
                {cert.revoked_at ? (
                  <button
                    onClick={() => openDeleteDialog(cert)}
                    className="btn-icon btn-icon-danger"
                    title="Delete certificate"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                ) : (
                  <span
                    title="Only revoked certificates can be deleted"
                    className="btn-icon opacity-50 cursor-not-allowed"
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
        totalItems={filtered.length}
        setPage={setPage}
        setPageSize={(s) => {
          setPageSize(s);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Certificate</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <strong>
                {deleteTarget?.certificate_number ?? "this certificate"}
              </strong>{" "}
              and all associated data.
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
