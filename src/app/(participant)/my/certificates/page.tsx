"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Paginator } from "@/components/ui/paginator";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { certificatesApi } from "@/lib/api/certificates";
import type { CertificateWithEvent } from "@/lib/api/certificates";
import { UploadIcon, SparklesIcon, SearchIcon } from "lucide-react";

type StatusFilter = "all" | "valid" | "expired" | "revoked";

const PAGE_SIZE = 25;
const FETCH_LIMIT = 100;
const FETCH_MAX_ITEMS = 2000;

function sourceOf(cert: CertificateWithEvent): "uploaded" | "system-generated" {
  if (cert.generation_mode === "file") return "uploaded";
  if (cert.generation_mode === "template") return "system-generated";
  return cert.file_path && cert.file_path.trim() !== "" ? "uploaded" : "system-generated";
}

function statusOf(cert: CertificateWithEvent): Exclude<StatusFilter, "all"> {
  if (cert.revoked_at) return "revoked";
  if (cert.expires_at && new Date(cert.expires_at).getTime() < Date.now()) return "expired";
  return "valid";
}

function eventNameOf(cert: CertificateWithEvent): string | null {
  return cert.events?.name ?? cert.event?.name ?? cert.event_name ?? null;
}

const STATUS_OPTIONS: Array<{ value: Exclude<StatusFilter, "all">; label: string }> = [
  { value: "valid", label: "Valid" },
  { value: "expired", label: "Expired" },
  { value: "revoked", label: "Revoked" },
];

export default function MyCertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;
    // Backend pages /me/certificates (default 25, max 100); fetch everything
    // once so search/filter/pagination see the full set.
    (async () => {
      const all: CertificateWithEvent[] = [];
      let offset = 0;
      for (;;) {
        const result = await certificatesApi.getMy({ limit: FETCH_LIMIT, offset });
        const items = result.data ?? [];
        all.push(...items);
        const hasMore = result.meta?.has_more ?? false;
        if (!hasMore || items.length < FETCH_LIMIT || all.length >= FETCH_MAX_ITEMS) break;
        offset += FETCH_LIMIT;
      }
      if (active) {
        setCertificates(all.slice(0, FETCH_MAX_ITEMS));
        setLoading(false);
      }
    })().catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return certificates.filter((cert) => {
      if (statusFilter !== "all" && statusOf(cert) !== statusFilter) return false;
      if (!q) return true;
      const eventName = eventNameOf(cert) ?? "";
      return (
        eventName.toLowerCase().includes(q) ||
        cert.certificate_number.toLowerCase().includes(q)
      );
    });
  }, [certificates, searchInput, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const showEmpty =
    !loading && filtered.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">My Certificates</h1>
        <p className="text-sm text-secondary">
          Certificates issued to you by the organization.
        </p>
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
            placeholder="Search by event or number..."
            className="input pl-8 py-1.5 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          {statusFilter !== "all" && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setPage(0);
              }}
              className="text-xs text-tertiary hover:text-secondary cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-tertiary">Loading...</p>
          </CardContent>
        </Card>
      ) : showEmpty ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-tertiary">
              {searchInput || statusFilter !== "all"
                ? "No certificates match your filters."
                : "No certificates have been issued to you yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="app-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificate</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((cert) => {
                const source = sourceOf(cert);
                const status = statusOf(cert);
                const eventName = eventNameOf(cert);
                return (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div className="max-w-[280px]">
                        <Link
                          href={`/my/certificates/${cert.id}`}
                          className="block truncate font-medium text-primary hover:underline"
                        >
                          {eventName ? `${eventName} (${cert.certificate_number})` : cert.certificate_number}
                        </Link>
                        <p className="mt-0.5 text-xs text-tertiary">
                          Issued {new Date(cert.issued_at).toLocaleDateString()}
                          {cert.expires_at &&
                            ` · Expires ${new Date(cert.expires_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      {status === "revoked" ? (
                        <span className="status-pill status-danger">REVOKED</span>
                      ) : status === "expired" ? (
                        <span className="status-pill status-warning">EXPIRED</span>
                      ) : (
                        <span className="status-pill status-active">VALID</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/my/certificates/${cert.id}`} className="btn-disclosure">
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Paginator
            page={safePage}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            totalItems={filtered.length}
            setPage={setPage}
            showSizeSelector={false}
          />
        </div>
      )}
    </div>
  );
}
