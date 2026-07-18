"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getEventWithStatsAction,
  updateEventAction,
} from "@/features/events/server/event.actions";
import AttendeesManager from "@/features/events/components/attendees-manager";
import { getTemplatesAction } from "@/features/templates/server/template.actions";
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
import { CalendarIcon, MapPinIcon, ChevronRightIcon, InfoIcon, PlusIcon } from "lucide-react";
import {
  issueCertificatesForCompletedAction,
} from "@/features/events/server/attendee.actions";

type Status = "draft" | "active" | "archive";

interface EventDetailData {
  event: Event;
  template: CertificateTemplate | null;
}

const statusConfig: Record<Status, { label: string; badgeClass: string; description: string }> = {
  draft: { label: "Draft", badgeClass: "badge-emerald", description: "Fully editable" },
  active: { label: "Active", badgeClass: "badge-brand", description: "Live event" },
  archive: { label: "Archived", badgeClass: "badge-blue", description: "Read-only" },
};

const statusTransitions: Record<Status, { target: Status; label: string; message: string }[]> = {
  draft: [
    {
      target: "active",
      label: "Activate",
      message:
        "This event will go live. Participants will be able to see it. The template will be locked and cannot be changed.",
    },
  ],
  active: [
    {
      target: "archive",
      label: "Archive",
      message:
        "This event will be archived. All editing, uploads, and certificate issuance will be permanently disabled.",
    },
  ],
  archive: [],
};

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const validUntil = new Date(dateStr);
  const today = new Date();
  validUntil.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return validUntil <= today;
}

export default function EventDetail({ eventId }: { eventId: string }) {
  const [data, setData] = useState<EventDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateMsg, setTemplateMsg] = useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "attendees">("details");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [editFields, setEditFields] = useState(false);
  const [fieldsValue, setFieldsValue] = useState({
    event_date: "",
    description: "",
    organizer: "",
    certificate_title: "",
    valid_until: "",
  });
  const [statusTarget, setStatusTarget] = useState<{
    target: Status;
    label: string;
    message: string;
  } | null>(null);
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [issueBusy, setIssueBusy] = useState(false);
  const [issueMessage, setIssueMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getEventWithStatsAction(eventId).then((result) => {
      if (active) {
        setData(result);
        setSelectedTemplate(result?.event.template_id ?? "");
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [eventId]);

  useEffect(() => {
    let active = true;
    getTemplatesAction(data?.event.organization_id ?? "")
      .then((t) => {
        if (active) setTemplates(t);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [data?.event.organization_id]);

  async function handleStatusChange(newStatus: Status) {
    if (!data) return;
    const allowed = (statusTransitions[data.event.status] ?? []).map((t) => t.target);
    if (!allowed.includes(newStatus)) return;

    const result = await updateEventAction(eventId, { status: newStatus });
    if (!result?.error && result?.event) {
      setData((prev) => (prev ? { ...prev, event: result.event! } : prev));
    }
  }

  async function handleTemplateSave() {
    setSavingTemplate(true);
    setTemplateMsg(null);
    const result = await updateEventAction(eventId, {
      template_id: selectedTemplate || undefined,
    });
    if (result?.error) {
      setTemplateMsg(result.error ?? "Failed to update template");
    } else if (result?.event) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              event: result.event!,
              template:
                templates.find((t) => t.id === (selectedTemplate || undefined)) ?? null,
            }
          : prev
      );
      setTemplateMsg("Template updated.");
    }
    setSavingTemplate(false);
  }

  function openStatusSheet() {
    if (!data) return;
    const transitions = statusTransitions[data.event.status] ?? [];
    if (transitions.length === 0) return;
    setStatusTarget(transitions[0]);
    setStatusDialogOpen(true);
  }

  function confirmStatusChange() {
    if (!statusTarget) return;
    handleStatusChange(statusTarget.target);
    setStatusDialogOpen(false);
    setStatusTarget(null);
  }

  async function handleNameSave() {
    if (!data || !nameValue.trim()) return;
    const result = await updateEventAction(eventId, { name: nameValue.trim() });
    if (!result?.error && result?.event) {
      setData((prev) => (prev ? { ...prev, event: result.event! } : prev));
    }
    setEditName(false);
  }

  async function handleIssueSelected() {
    if (!data) return;
    setIssueBusy(true);
    setIssueMessage(null);
    const result = await issueCertificatesForCompletedAction(eventId, {
      send_email: false,
    });
    setIssueBusy(false);
    const failed = result.results.filter((r) => !r.success).length;
    setIssueMessage(
      `${result.issued} certificate(s) issued` +
        (failed ? `, ${failed} failed` : "")
    );
    setSelectedAttendeeIds([]);
  }

  async function handleFieldsSave() {
    if (!data) return;
    const result = await updateEventAction(eventId, {
      event_date: fieldsValue.event_date || undefined,
      description: fieldsValue.description || undefined,
      organizer: fieldsValue.organizer || undefined,
      certificate_title: fieldsValue.certificate_title || undefined,
      valid_until: fieldsValue.valid_until || undefined,
    });
    if (!result?.error && result?.event) {
      setData((prev) => (prev ? { ...prev, event: result.event! } : prev));
    }
    setEditFields(false);
  }

  if (loading) return <SkeletonDetail />;
  if (!data) return <p className="text-red-600 text-sm">Event not found</p>;

  const { event, template } = data;
  const config = statusConfig[event.status] ?? { label: event.status, badgeClass: "badge-emerald", description: "" };
  const transitions = statusTransitions[event.status] ?? [];
  const canChangeStatus = transitions.length > 0;
  const showArchiveTip = event.status === "active" && isExpired(event.valid_until);
  const readOnly = event.status === "archive";

  return (
    <div className="space-y-6">
      <div>
        {editName ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNameSave();
            }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="font-heading text-2xl font-bold tracking-tight input flex-1"
            />
            <button type="submit" className="btn-brand">
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditName(false)}
              className="btn-brand-soft"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <h1
              className={`font-heading text-2xl font-bold tracking-tight ${
                event.status === "draft"
                  ? "cursor-pointer rounded-lg px-1 -mx-1 hover:bg-surface-hover transition-colors"
                  : ""
              }`}
              onClick={() => {
                if (event.status !== "draft") return;
                setNameValue(event.name);
                setEditName(true);
              }}
              title={event.status === "draft" ? "Click to edit" : undefined}
            >
              {event.name}
            </h1>
            {event.status === "draft" && (
              <span className="text-xs text-tertiary">Click to edit</span>
            )}
          </div>
        )}
        <div className="mt-1 flex items-center gap-3 text-sm text-tertiary">
          {event.event_date && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3.5" />
              {new Date(event.event_date).toLocaleDateString()}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPinIcon className="size-3.5" />
              {event.location}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-surface-tertiary rounded-xl">
        {(["details", "attendees"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 shrink-0 text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activeTab === tab
                ? "bg-brand-600 text-white shadow-[var(--shadow-ios-sm)]"
                : "text-tertiary hover:text-secondary"
            }`}
          >
            {tab === "details" ? "Details" : "Attendees"}
          </button>
        ))}
      </div>

      {activeTab === "details" && (
        <div className="space-y-6">
          {event.status === "draft" ? (
            <div className="app-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <p className="section-title">Event Details</p>
                {editFields ? (
                  <div className="flex items-center gap-2 ml-auto">
                    <button type="button" onClick={handleFieldsSave} className="btn-brand text-xs">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditFields(false)} className="btn-brand-soft text-xs">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFieldsValue({
                        event_date: event.event_date ?? "",
                        description: event.description ?? "",
                        organizer: event.organizer ?? "",
                        certificate_title: event.certificate_title ?? "",
                        valid_until: event.valid_until ?? "",
                      });
                      setEditFields(true);
                    }}
                    title="Edit event details"
                    className="text-xs text-info font-medium cursor-pointer"
                  >
                    (edit)
                  </button>
                )}
              </div>
              {editFields ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-tertiary mb-1">Event Date</label>
                    <input
                      type="date"
                      value={fieldsValue.event_date ? fieldsValue.event_date.slice(0, 10) : ""}
                      onChange={(e) => setFieldsValue((p) => ({ ...p, event_date: e.target.value }))}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-tertiary mb-1">Description</label>
                    <textarea
                      value={fieldsValue.description}
                      onChange={(e) => setFieldsValue((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-tertiary mb-1">Organizer</label>
                    <input
                      value={fieldsValue.organizer}
                      onChange={(e) => setFieldsValue((p) => ({ ...p, organizer: e.target.value }))}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-tertiary mb-1">Certificate Title</label>
                    <input
                      value={fieldsValue.certificate_title}
                      onChange={(e) => setFieldsValue((p) => ({ ...p, certificate_title: e.target.value }))}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-tertiary mb-1">Valid Until</label>
                    <input
                      type="date"
                      value={fieldsValue.valid_until ? fieldsValue.valid_until.slice(0, 10) : ""}
                      onChange={(e) => setFieldsValue((p) => ({ ...p, valid_until: e.target.value }))}
                      className="input text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {event.event_date && (
                    <div className="flex items-center justify-between px-1 py-2.5">
                      <span className="text-sm text-tertiary">Event Date</span>
                      <span className="text-sm font-medium">{new Date(event.event_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {event.description && (
                    <div className="flex items-center justify-between px-1 py-2.5">
                      <span className="text-sm text-tertiary">Description</span>
                      <span className="text-sm font-medium text-right max-w-[60%] truncate">{event.description}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-1 py-2.5">
                    <span className="text-sm text-tertiary">Organizer</span>
                    <span className="text-sm font-medium">{event.organizer || "\u2014"}</span>
                  </div>
                  <div className="flex items-center justify-between px-1 py-2.5">
                    <span className="text-sm text-tertiary">Certificate Title</span>
                    <span className="text-sm font-medium">{event.certificate_title || "\u2014"}</span>
                  </div>
                  <div className="flex items-center justify-between px-1 py-2.5">
                    <span className="text-sm text-tertiary">Valid Until</span>
                    <span className="text-sm font-medium">
                      {event.valid_until ? new Date(event.valid_until).toLocaleDateString() : "\u2014"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="app-card divide-y divide-border">
              {event.event_date && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-tertiary">Event Date</span>
                  <span className="text-sm font-medium">{new Date(event.event_date).toLocaleDateString()}</span>
                </div>
              )}
              {event.description && (
                <div className="px-4 py-3">
                  <p className="text-xs text-tertiary mb-1">Description</p>
                  <p className="text-sm text-secondary">{event.description}</p>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-tertiary">Organizer</span>
                <span className="text-sm font-medium">{event.organizer || "\u2014"}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-tertiary">Certificate Title</span>
                <span className="text-sm font-medium">{event.certificate_title || "\u2014"}</span>
              </div>
              {event.valid_until && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-tertiary">Valid Until</span>
                  <span className="text-sm font-medium">{new Date(event.valid_until).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}

          <div className="app-card p-4">
            <p className="section-title mb-3">Status</p>
            <button
              type="button"
              onClick={openStatusSheet}
              disabled={!canChangeStatus}
              className={`flex w-full items-center justify-between rounded-xl border border-border bg-surface-secondary px-4 py-3 text-left transition-all ${
                canChangeStatus
                  ? "hover:border-border-strong hover:shadow-[var(--shadow-ios-sm)] active:scale-[0.99]"
                  : "cursor-default opacity-70"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={config.badgeClass}>{config.label}</span>
                <span className="text-xs text-tertiary">{config.description}</span>
              </div>
              {canChangeStatus && <ChevronRightIcon className="size-4 text-tertiary" />}
            </button>
          </div>

          {showArchiveTip && (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-info-text)]" />
              <div>
                <p className="font-medium text-[var(--color-info-text)]">
                  Validity period has ended
                </p>
                <p className="mt-0.5 text-[var(--color-info-text)] opacity-80">
                  This event&apos;s &quot;Valid Until&quot; date has passed. Consider archiving
                  it to prevent new certificate issuance.
                </p>
              </div>
            </div>
          )}

          <div className="app-card p-4">
            <p className="section-title mb-3">Template</p>
            <div className="mb-2 text-sm">
              <span className="text-tertiary">Current: </span>
              <span className="font-medium">{template?.name ?? "No template"}</span>
            </div>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              disabled={event.status !== "draft"}
              className="input mb-3 disabled:opacity-50"
            >
              <option value="">No template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTemplateSave}
                disabled={
                  savingTemplate ||
                  selectedTemplate === (event.template_id ?? "") ||
                  event.status !== "draft"
                }
                className="btn-brand-soft disabled:opacity-50"
              >
                {savingTemplate ? "Saving..." : "Assign Template"}
              </button>
              {(selectedTemplate || event.template_id) && (
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="btn-brand-soft"
                >
                  Preview Certificate
                </button>
              )}
              {templateMsg && (
                <span className="text-xs text-tertiary">{templateMsg}</span>
              )}
            </div>
          </div>

        </div>
      )}

      {activeTab === "attendees" && (
        <div className="space-y-4">
          {issueMessage && (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-success-text)]" />
              <p className="text-[var(--color-success-text)]">{issueMessage}</p>
            </div>
          )}
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddDialog(true)}
                className="btn-brand"
              >
                <PlusIcon className="size-4" />
                Add Attendee
              </button>
              <Link
                href={`/events/${eventId}/upload`}
                className="btn-brand-soft"
              >
                Bulk Import
              </Link>
              <button
                type="button"
                onClick={handleIssueSelected}
                disabled={issueBusy || selectedAttendeeIds.length === 0}
                className="btn-brand disabled:opacity-50"
              >
                {issueBusy
                  ? "Issuing..."
                  : `Issue Certificate${selectedAttendeeIds.length > 0 ? ` (${selectedAttendeeIds.length})` : ""}`}
              </button>
            </div>
          )}
          <AttendeesManager
            eventId={eventId}
            organizationId={event.organization_id}
            readOnly={event.status === "archive"}
            onSelectionChange={setSelectedAttendeeIds}
            showAddDialog={showAddDialog}
            onAddDialogHandled={() => setShowAddDialog(false)}
          />
        </div>
      )}

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Select a new status for this event.
            </DialogDescription>
          </DialogHeader>

          {statusTarget && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface-secondary p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-tertiary">Current</span>
                  <span className={statusConfig[event.status].badgeClass}>
                    {statusConfig[event.status].label}
                  </span>
                </div>
                <div className="my-2 flex justify-center">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted">
                    <span className="text-xs text-tertiary">&darr;</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-tertiary">Target</span>
                  <span className={statusConfig[statusTarget.target].badgeClass}>
                    {statusConfig[statusTarget.target].label}
                  </span>
                </div>
              </div>

              <p className="text-sm text-secondary">{statusTarget.message}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={statusTarget?.target === "archive" ? "destructive" : "default"}
              onClick={confirmStatusChange}
            >
              {statusTarget?.label ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewOpen && (() => {
        const tid = selectedTemplate || event.template_id;
        const t = templates.find((x) => x.id === tid) ?? template;
        if (!t) return null;
        const srcDoc = `<!DOCTYPE html><html><head><meta name="viewport" content="width=960"><style>body{margin:0;overflow:hidden;}${t.css_content ?? ""}</style></head><body>${t.html_content.replace(/\{\{recipient_name\}\}/g, "Juan Dela Cruz").replace(/\{\{certificate_number\}\}/g, "CERT-000001").replace(/\{\{issued_date\}\}/g, new Date(event.event_date ?? "").toLocaleDateString()).replace(/\{\{organization_name\}\}/g, "Lyceum Of Alabang")}</body></html>`;
        return (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/5 backdrop-blur-sm"
              onClick={() => setPreviewOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="relative pointer-events-auto" style={{ height: "85vh", aspectRatio: "297 / 210", maxWidth: "90vw" }}>
                <iframe
                  srcDoc={srcDoc}
                  className="w-full h-full bg-white block shadow-2xl"
                  title="Template Preview"
                />
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="absolute top-3 right-3 bg-white/80 text-black rounded-full w-8 h-8 flex items-center justify-center shadow-lg backdrop-blur-md border border-black/5 hover:bg-white/90 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
