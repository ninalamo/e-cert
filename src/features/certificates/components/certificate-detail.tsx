"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getCertificateAction,
  revokeCertificateAction,
  getCertificateQrCodeAction,
  getSessionRoleAction,
} from "@/features/certificates/server/certificate.actions";
import { getEventAction } from "@/features/events/server/event.actions";
import { getTemplateAction } from "@/features/templates/server/template.actions";
import EmailHistory from "@/features/certificates/components/email-history";
import type { Certificate } from "@/types/certificate";
import type { Event } from "@/types/event";
import type { CertificateTemplate } from "@/types/template";
import { SkeletonDetail } from "@/components/ui/skeleton";
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
  ShieldOffIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  InfoIcon,
  DownloadIcon,
  ExternalLinkIcon,
} from "lucide-react";

interface CertificateDetailProps {
  certificateId: string;
  showAdminFeatures?: boolean;
}

export default function CertificateDetail({
  certificateId,
  showAdminFeatures = true,
}: CertificateDetailProps) {
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get("eventId");

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cert = await getCertificateAction(certificateId);
      if (cancelled) return;
      if (!cert) {
        setError("Certificate not found");
        setLoading(false);
        return;
      }
      setCertificate(cert);

      const promises: Promise<void>[] = [];

      if (cert.template_id) {
        promises.push(
          getTemplateAction(cert.template_id).then((tpl) => {
            if (!cancelled && tpl) setTemplate(tpl);
          })
        );
      }

      const eventToShow = eventIdParam || cert.event_id;
      if (eventToShow) {
        promises.push(
          getEventAction(eventToShow).then((evt) => {
            if (!cancelled) setEvent(evt);
          })
        );
      }

      promises.push(
        getCertificateQrCodeAction(cert.certificate_number).then((url) => {
          if (!cancelled) setQrDataUrl(url);
        })
      );

      await Promise.all(promises);

      if (showAdminFeatures) {
        getSessionRoleAction().then((role) => {
          if (!cancelled) setIsAdmin(role === "admin" || role === "staff");
        });
      }

      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [certificateId, eventIdParam, showAdminFeatures]);

  async function handleRevoke() {
    if (!certificate || !revokeReason.trim()) return;
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

  if (loading) {
    return <SkeletonDetail />;
  }

  if (error || !certificate) {
    return (
      <p className="text-center text-sm text-red-600 py-8">
        {error || "Not found"}
      </p>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {eventIdParam && (
        <Link
          href={`/events/${eventIdParam}?tab=attendees`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="size-4" />
          Return to Events
        </Link>
      )}

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
          {showAdminFeatures && isAdmin && !certificate.revoked_at && (
            <button
              onClick={() => setRevokeDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 active:scale-[0.97] transition-all"
            >
              <ShieldOffIcon className="size-4" />
              <span className="hidden sm:inline">Revoke</span>
            </button>
          )}
          <a
            href={`/api/certificates/${certificate.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-ios-sm)] hover:bg-[var(--color-brand-700)] active:scale-[0.97] transition-all"
          >
            <DownloadIcon className="size-4" />
            <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div className="divide-y divide-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-[var(--color-text-muted)]">Status</span>
            {certificate.revoked_at ? (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                Revoked
              </span>
            ) : (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                Active
              </span>
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
            <span className="text-sm text-[var(--color-text-muted)]">Issued</span>
            <span className="text-sm font-medium">
              {new Date(certificate.issued_at).toLocaleDateString()}
            </span>
          </div>
          {certificate.expires_at && (
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-[var(--color-text-muted)]">Expires</span>
              <span className="text-sm font-medium">
                {new Date(certificate.expires_at).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-[var(--color-text-muted)]">Source</span>
            <span className="text-sm font-medium">
              {template?.name ?? (certificate.file_path ? "Uploaded PDF" : "—")}
            </span>
          </div>
        </div>
      </div>

      {certificate.revoked_at && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
          <p className="font-medium">
            Revoked on {new Date(certificate.revoked_at).toLocaleDateString()}
          </p>
          {certificate.revoke_reason && (
            <p className="mt-1 text-red-600">{certificate.revoke_reason}</p>
          )}
        </div>
      )}

      {event && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
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
                  Date
                </span>
                <span className="text-sm font-medium">
                  {new Date(event.event_date).toLocaleDateString()}
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
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="text-sm font-semibold mb-3">Verification</h3>
          <div className="flex items-center gap-4">
            <img
              src={qrDataUrl}
              alt={`QR code for ${certificate.certificate_number}`}
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

      {showAdminFeatures && isAdmin && !certificate.revoked_at && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <EmailHistory certificateId={certificate.id} />
        </div>
      )}

      {showAdminFeatures && isAdmin && (
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
