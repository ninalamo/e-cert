"use client";

import { useState } from "react";
import { eventsApi } from "@/lib/api/events";
import type { Event } from "@/types/event";
import { InfoIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Status = "draft" | "active" | "archive";

const statusConfig: Record<Status, { label: string; badgeClass: string; description: string }> = {
  draft: { label: "Draft", badgeClass: "status-badge status-badge--draft", description: "Fully editable" },
  active: { label: "Active", badgeClass: "status-badge status-badge--active", description: "Live event" },
  archive: { label: "Archived", badgeClass: "status-badge status-badge--archive", description: "Read-only" },
};

const statusTransitions: Record<Status, { target: Status; label: string; message: string }[]> = {
  draft: [
    {
      target: "active",
      label: "Activate",
      message:
        "This event will go live. Participants will be able to see it. Choose how the template should be handled below.",
    },
    {
      target: "archive",
      label: "Archive",
      message:
        "This event will be archived. All editing, uploads, and certificate issuance will be permanently disabled.",
    },
  ],
  active: [
    {
      target: "draft",
      label: "Revert to Draft",
      message:
        "This event will be moved back to Draft. Participants will no longer see it and certificate issuance will be disabled until re-activated. Any certificates already issued remain valid as-is and are not updated by this change.",
    },
    {
      target: "archive",
      label: "Archive",
      message:
        "This event will be archived. All editing, uploads, and certificate issuance will be permanently disabled.",
    },
  ],
  archive: [
    {
      target: "draft",
      label: "Revert to Draft",
      message:
        "This event will be unarchived and moved back to Draft. All editing and uploads will be re-enabled.",
    },
    {
      target: "active",
      label: "Reactivate",
      message:
        "This event will go live again. Participants will be able to see it and certificate issuance will be re-enabled.",
    },
  ],
};

type TemplateMode = "lock" | "copy";

function buildMissingFieldsMessage(event: Event): string {
  const missing: string[] = [];
  if (!event.template_id) missing.push("a template");
  if (!event.event_date) missing.push("a Certificate Issue Date");
  return `Set ${missing.join(" and ")} before activating this event.`;
}

export {
  statusConfig,
  statusTransitions,
};

export default function StatusChangeDialog({
  event,
  issuedCertificateCount = 0,
  open,
  onOpenChange,
  onStatusChanged,
}: {
  event: Event;
  issuedCertificateCount?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged: (event: Event) => void;
}) {
  const [target, setTarget] = useState<{
    target: Status;
    label: string;
    message: string;
  } | null>(null);
  const [templateMode, setTemplateMode] = useState<TemplateMode>("lock");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgeDraft, setAcknowledgeDraft] = useState(false);

  const showDraftWarning =
    target?.target === "draft" &&
    event.status === "active" &&
    issuedCertificateCount > 0;


  const transitions = statusTransitions[event.status] ?? [];
  const missingFieldsMessage = buildMissingFieldsMessage(event);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setTarget(null);
      setTemplateMode("lock");
      setError(null);
      setAcknowledgeDraft(false);
    }
    onOpenChange(open);
  }

  function openWithFirstTransition() {
    if (transitions.length === 0) return;
    setTarget(transitions[0]);
    setTemplateMode("lock");
    setError(null);
    setAcknowledgeDraft(false);
    onOpenChange(true);
  }

  async function handleConfirm() {
    if (!target) return;
    if (showDraftWarning && !acknowledgeDraft) return;

    if (target.target === "active") {
      const missing: string[] = [];
      if (!event.template_id) missing.push("a template");
      if (!event.event_date) missing.push("a certificate issue date");
      if (missing.length > 0) {
        setError(
          `Set ${missing.join(" and ")} in the Details/Template sections before activating.`
        );
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      if (target.target === "active" && templateMode === "copy" && event.template_id) {
        const { data: cloned } = await eventsApi.cloneTemplate(event.template_id);
        if (!cloned?.template) {
          setError("Failed to clone template");
          return;
        }
        const { data: assign } = await eventsApi.update(event.id, { template_id: cloned.template.id });
        if (!assign) {
          setError("Failed to assign cloned template");
          return;
        }
      }

      const { data: result } = await eventsApi.update(event.id, { status: target.target });
      if (!result) {
        setError("Failed to update event status");
        return;
      }
      onStatusChanged(result);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update event status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openWithFirstTransition}
        disabled={transitions.length === 0}
        className={`flex w-full items-center justify-between rounded-xl border border-border bg-surface-secondary px-4 py-3 text-left transition-all ${
          transitions.length > 0
            ? "hover:border-border-strong hover:shadow-[var(--shadow-ios-sm)] active:scale-[0.99]"
            : "cursor-default opacity-70"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={statusConfig[event.status].badgeClass}>{statusConfig[event.status].label}</span>
          <span className="text-xs text-tertiary">{statusConfig[event.status].description}</span>
        </div>
        {transitions.length > 0 && (
          <svg className="size-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        )}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Select a new status for this event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary px-4 py-3">
              <span className="text-xs text-tertiary">Current</span>
              <span className={`ml-auto ${statusConfig[event.status].badgeClass}`}>
                {statusConfig[event.status].label}
              </span>
            </div>

            {transitions.map((t) => {
              const selected = target?.target === t.target;
              const missingTemplate = !event.template_id;
              const missingIssueDate = !event.event_date;
              const needsWarning =
                t.target === "active" && selected && (missingTemplate || missingIssueDate);
              return (
                <button
                  key={t.target}
                  type="button"
                  onClick={() => setTarget(t)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                    selected
                      ? "border-brand-600 bg-brand-500/15"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{t.label}</span>
                    <span className={statusConfig[t.target].badgeClass}>
                      {statusConfig[t.target].label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-tertiary">
                    {needsWarning ? missingFieldsMessage : t.message}
                  </p>
                </button>
              );
            })}

            {target?.target === "active" && event.template_id && (
              <div className="rounded-xl border border-border bg-surface-secondary p-4 text-black">
                <p className="text-sm font-semibold mb-2">Template handling</p>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="templateMode"
                      checked={templateMode === "lock"}
                      onChange={() => setTemplateMode("lock")}
                      className="mt-0.5"
                    />
                    <span className="text-xs">
                      <span className="font-medium">Lock original</span> &mdash; keep using the current template. It becomes locked (uneditable) while this event is active or archived.
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="templateMode"
                      checked={templateMode === "copy"}
                      onChange={() => setTemplateMode("copy")}
                      className="mt-0.5"
                    />
                    <span className="text-xs">
                      <span className="font-medium">Make a copy</span> &mdash; clone the template into a new locked copy mapped only to this event.
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {showDraftWarning && (
            <div className="space-y-3 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4 text-sm text-[var(--color-warning-text)]">
              <div className="flex items-start gap-3">
                <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-warning-text)]" />
                <p>
                  This event already has <strong>{issuedCertificateCount}</strong>{" "}
                  issued certificate{issuedCertificateCount !== 1 ? "s" : ""}. Moving it back to Draft{" "}
                  <strong>will not update or revoke</strong> those certificates &mdash; they remain
                  valid exactly as issued. If you change the template or rendered details while in
                  Draft and later re-activate the event, those certificates will need to be re-issued
                  (re-issuing keeps the same certificate number and only updates the rendered content).
                </p>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledgeDraft}
                  onChange={(e) => setAcknowledgeDraft(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-xs">
                  I understand that already-issued certificates are unaffected and would need to be
                  re-issued if I change the template or render details.
                </span>
              </label>
            </div>
          )}

          {error && (
            <p className="text-xs text-[var(--color-danger-text)]">{error}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant={target?.target === "archive" ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={busy || (showDraftWarning && !acknowledgeDraft)}
            >
              {busy ? "Working..." : target?.label ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
