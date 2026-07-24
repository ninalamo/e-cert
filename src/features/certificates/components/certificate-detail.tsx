"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { revokeCertificateAction } from "@/features/certificates/server/certificate.actions";
import EmailHistory from "@/features/certificates/components/email-history";
import type { Certificate } from "@/types/certificate";
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
import {
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  InfoIcon,
  PrinterIcon,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function fmtDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

interface CertificateDetailProps {
  certificate: Certificate;
  event: Event | null;
  qrDataUrl: string | null;
  isAdmin: boolean;
  eventIdParam: string | null;
}

export default function CertificateDetail({
  certificate: initialCertificate,
  event: initialEvent,
  qrDataUrl,
  isAdmin,
  eventIdParam,
}: CertificateDetailProps) {
  const [certificate, setCertificate] = useState<Certificate>(initialCertificate);
  const [event] = useState<Event | null>(initialEvent);

  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  async function handleRevoke() {
    if (!revokeReason.trim()) return;
    setRevoking(true);
    setRevokeError(null);
    const result = await revokeCertificateAction(
      certificate.id,
      revokeReason.trim()
    );
    setRevoking(false);
    if (result?.error) {
      setRevokeError(result.error);
      return;
    }
    if (result?.certificate) {
      setCertificate(result.certificate);
      setRevokeDialogOpen(false);
      setRevokeReason("");
    }
  }

  return (
    <div className="space-y-4 pb-8">
      {eventIdParam && (
        <Link
          href={`/events/${eventIdParam}?tab=attendees`}
          className="btn btn-view"
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Link>
      )}

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/certificates" />}>
              Certificates
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{certificate.certificate_number}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold truncate">
            Certificate
          </h2>
          <p className="text-sm text-muted-foreground font-mono truncate">
            {certificate.certificate_number}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* {isAdmin && !certificate.revoked_at && (
            <button
              onClick={() => setRevokeDialogOpen(true)}
              className="btn-danger"
            >
              <ShieldOffIcon className="size-4" />
              <span className="hidden sm:inline">Revoke</span>
            </button>
          )} */}
          <button
            onClick={() => window.open(`/view/${certificate.id}`, "_blank")}
            className="btn-brand"
          >
            <PrinterIcon className="size-4" />
            <span className="hidden sm:inline">Preview</span>
            <span className="sm:hidden">Preview</span>
          </button>
        </div>
      </div>

      <div className="app-card overflow-hidden">
        <div className="divide-y divide-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-[var(--color-text-muted)]">Status</span>
            {certificate.revoked_at ? (
              <span className="status-pill status-revoked">Revoked</span>
            ) : (
              <span className="status-pill status-active">Active</span>
            )}
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-[var(--color-text-muted)]">Recipient</span>
            <span className="text-sm font-medium text-right truncate ml-4">
              {certificate.recipient_name}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-[var(--color-text-muted)]">Email</span>
            <span className="text-sm text-right truncate ml-4">
              {certificate.recipient_email}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-[var(--color-text-muted)]">Certificate Generated Date</span>
            <span className="text-sm font-medium">
              {fmtDate(certificate.issued_at)}
            </span>
          </div>
          {certificate.expires_at && (
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-[var(--color-text-muted)]">Certificate Expiry Date</span>
              <span className="text-sm font-medium">
                {fmtDate(certificate.expires_at)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-[var(--color-text-muted)]">Source</span>
            <span className="text-sm font-medium">
              {certificate.file_path ? "File Upload" : "System Generated"}
            </span>
          </div>
        </div>
      </div>

      {certificate.revoked_at && (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
          <p className="font-medium">
            Revoked on {fmtDate(certificate.revoked_at)}
          </p>
          {certificate.revoke_reason && (
            <p className="mt-1 text-[var(--color-danger-text)]/90">{certificate.revoke_reason}</p>
          )}
        </div>
      )}

      {event && (
        <div className="app-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold">Event</h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                <UserIcon className="size-3.5" />
                Name
              </span>
              <span className="text-sm font-medium truncate ml-4">{event.name}</span>
            </div>
            {event.event_date && (
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                  <CalendarIcon className="size-3.5" />
                  Certificate Issue Date
                </span>
                <span className="text-sm font-medium">
                  {fmtDate(event.event_date)}
                </span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                  <MapPinIcon className="size-3.5" />
                  Location
                </span>
                <span className="text-sm font-medium truncate ml-4">{event.location}</span>
              </div>
            )}
            {event.organizer && (
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-sm text-[var(--color-text-muted)]">Organizer</span>
                <span className="text-sm font-medium truncate ml-4">{event.organizer}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {qrDataUrl && (
        <div className="app-card p-4">
          <h3 className="text-sm font-semibold mb-3">Verification</h3>
          <div className="flex items-center gap-4">
            <Image
              src={qrDataUrl}
              alt={`QR code for ${certificate.certificate_number}`}
              width={120}
              height={120}
              unoptimized
              className="size-[100px] sm:size-[120px] rounded-xl border bg-white p-1 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm text-[var(--color-text-muted)]">
                Scan to verify this certificate
              </p>
              <p className="text-xs font-mono text-[var(--color-text)] mt-1 break-all">
                /verify?number={certificate.certificate_number}
              </p>
            </div>
          </div>
        </div>
      )}

      {isAdmin && !certificate.revoked_at && (
        <div className="app-card p-4">
          <EmailHistory certificateId={certificate.id} />
        </div>
      )}

      {isAdmin && (
        <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke Certificate</DialogTitle>
              <DialogDescription>
                This will permanently revoke{" "}
                <strong>{certificate.certificate_number}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
                <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
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
              <Button
                variant="outline"
                onClick={() => {
                  setRevokeDialogOpen(false);
                  setRevokeReason("");
                }}
              >
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
      )}
    </div>
  );
}
