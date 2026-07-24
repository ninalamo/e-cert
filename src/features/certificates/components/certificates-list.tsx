"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ORG_ID } from "@/lib/org";
import {
  getCertificatesWithEventAction,
  revokeCertificateAction,
} from "../server/certificate.actions";
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
import { usePagination } from "@/components/ui/paginator";
import {
  SearchIcon,
  FilterIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShieldOffIcon,
  EyeIcon,
} from "lucide-react";
import type { Event } from "@/types/event";

interface CertificateWithEvent extends Certificate {
  events: { name: string } | null;
}

interface CertificatesListProps {
  initialCertificates: CertificateWithEvent[];
  initialQuery?: string;
}

export default function CertificatesList({
  initialCertificates,
  initialQuery = "",
}: CertificatesListProps) {
  const [certificates] = useState<CertificateWithEvent[]>(initialCertificates);
  const [search, setSearch] = useState(initialQuery);
  const [eventFilter, setEventFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<CertificateWithEvent | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadCertificates() {
    try {
      const data = await getCertificatesWithEventAction(ORG_ID);
      return data;
    } catch {
      setLoadError("Failed to load certificates.");
      return [];
    }
  }

  async function handleRevoke() {
    if (!revokeTarget || !revokeReason.trim()) return;
    setRevoking(true);
    setRevokeError(null);
    const result = await revokeCertificateAction(revokeTarget.id, revokeReason.trim());
    setRevoking(false);
    if (result?.error) {
      setRevokeError(result.error);
      return;
    }
    setRevokeDialogOpen(false);
    setRevokeReason("");
    setRevokeTarget(null);
  }

  const openRevokeDialog = (cert: CertificateWithEvent) => {
    setRevokeTarget(cert);
    setRevokeReason("");
    setRevokeError(null);
    setRevokeDialogOpen(true);
  };

  const closeRevokeDialog = () => {
    setRevokeDialogOpen(false);
    setRevokeTarget(null);
    setRevokeReason("");
    setRevokeError(null);
  };

  const filtered = useMemo(() => {
    return certificates.filter((c) => {
      const matchesSearch =
        !search ||
        c.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
        c.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
        c.certificate_number.toLowerCase().includes(search.toLowerCase());

      const matchesEvent =
        !eventFilter || c.events?.name === eventFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !c.revoked_at) ||
        (statusFilter === "revoked" && !!c.revoked_at);

      return matchesSearch && matchesEvent && matchesStatus;
    });
  }, [certificates, search, eventFilter, statusFilter]);

  const events = useMemo(() => {
    const eventMap = new Map<string, string>();
    certificates.forEach((c) => {
      if (c.events) {
        eventMap.set(c.events.name, c.events.name);
      }
    });
    return Array.from(eventMap.values()).sort();
  }, [certificates]);

  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } =
    usePagination(filtered, 10);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tertiary" />
          <input
            type="text"
            placeholder="Search by name, email, or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-96 rounded-md border pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <FilterIcon className="size-4 text-tertiary shrink-0" />
          <select
            value={eventFilter}
            onChange={(e) => {
              setEventFilter(e.target.value);
              setPage(0);
            }}
            className="input text-sm w-full sm:w-auto"
          >
            <option value="">All Events</option>
            {events.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="input text-sm w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
          {loadError}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="border rounded-md p-8 text-center">
          <p className="text-muted-foreground">No certificates found.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-6">
          {groupByEvent(paginatedItems).map(({ eventName, certificates: groupCerts }) => (
            <div key={eventName ?? "(no event)"} className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                {eventName ?? "No Event"}
                <ChevronRightIcon className="size-4 text-tertiary" />
                <span className="text-xs font-normal text-tertiary">
                  {groupCerts.length} certificate{groupCerts.length !== 1 ? "s" : ""}
                </span>
              </h3>
              <div className="tbl-container">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="text-left">Number</th>
                      <th className="text-left">Recipient</th>
                      <th className="text-left">Email</th>
                      <th className="text-left">Issued</th>
                      <th className="text-left">Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupCerts.map((cert) => (
                      <tr key={cert.id}>
                        <td className="font-mono text-xs">
                          {cert.certificate_number}
                        </td>
                        <td>{cert.recipient_name}</td>
                        <td className="text-tertiary">{cert.recipient_email}</td>
                        <td className="text-tertiary">
                          {new Date(cert.issued_at).toLocaleDateString()}
                        </td>
                        <td>
                          {cert.revoked_at ? (
                            <span className="status-pill status-revoked">
                              Revoked
                            </span>
                          ) : (
                            <span className="status-pill status-active">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/certificates/${cert.id}`}
                            className="text-xs text-info hover:underline mr-3"
                          >
                            <EyeIcon className="size-3 inline mr-1" />
                            View
                          </Link>
                          {!cert.revoked_at && (
                            <button
                              onClick={() => openRevokeDialog(cert)}
                              className="text-xs text-danger hover:underline"
                            >
                              <ShieldOffIcon className="size-3 inline mr-1" />
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-tertiary">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="input text-xs w-auto py-1"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded border border-default bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed text-xs"
            >
              Prev
            </button>
            <span className="text-xs text-tertiary">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded border border-default bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={closeRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Certificate</DialogTitle>
            <DialogDescription>
              This will permanently revoke{" "}
              <strong>
                {revokeTarget?.certificate_number ?? "this certificate"}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
              <ShieldOffIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
              <p className="text-[var(--color-danger-text)]">
                This cannot be undone. The certificate will show as invalid on
                verification.
              </p>
            </div>
            <div>
              <label
                htmlFor="revoke-reason"
                className="block text-sm font-medium"
              >
                Reason *
              </label>
              <textarea
                id="revoke-reason"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                required
                placeholder="Why is this certificate being revoked?"
                className="input mt-1"
              />
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
              onClick={handleRevoke}
              disabled={revoking || !revokeReason.trim()}
            >
              {revoking ? "Revoking..." : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function groupByEvent(
  items: CertificateWithEvent[]
): Array<{ eventName: string | null; certificates: CertificateWithEvent[] }> {
  const groups = new Map<string | null, CertificateWithEvent[]>();
  for (const item of items) {
    const key = item.events?.name ?? null;
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return Array.from(groups.entries()).map(([eventName, certs]) => ({
    eventName,
    certificates: certs,
  }));
}