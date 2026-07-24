"use client";

import { useState, useEffect } from "react";
import {
  getEventWithStatsAction,
} from "@/features/events/server/event.actions";
import { getTemplatesAction, getEmailTemplatesAction } from "@/features/templates/server/template.actions";
import type { Event } from "@/types/event";
import type { CertificateTemplate } from "@/types/template";
import { SkeletonEventDetail } from "@/components/ui/skeleton";
import { CalendarIcon, MapPinIcon, InfoIcon, Trash2Icon } from "lucide-react";
import { statusConfig } from "./components/status-change-dialog";
import StatusChangeDialog from "./components/status-change-dialog";
import DeleteDialog from "./components/delete-dialog";
import EventFieldsCard from "./components/event-fields-card";
import TemplateCard from "./components/template-card";
import AttendeesTab from "./components/attendees-tab";

interface EventDetailData {
  event: Event;
  template: CertificateTemplate | null;
  emailTemplate: CertificateTemplate | null;
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const validUntil = new Date(dateStr);
  const today = new Date();
  validUntil.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return validUntil <= today;
}

export default function EventDetail({
  eventId,
  canDelete = false,
  initialTab = "details",
  initialData = null,
  initialTemplates = [],
  initialEmailTemplates = [],
}: {
  eventId: string;
  canDelete?: boolean;
  initialTab?: "details" | "attendees";
  initialData?: EventDetailData | null;
  initialTemplates?: CertificateTemplate[];
  initialEmailTemplates?: CertificateTemplate[];
}) {
  const [data, setData] = useState<EventDetailData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [templates, setTemplates] = useState<CertificateTemplate[]>(initialTemplates);
  const [emailTemplates, setEmailTemplates] = useState<CertificateTemplate[]>(initialEmailTemplates);
  const [activeTab, setActiveTab] = useState<"details" | "attendees">(initialTab);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  useEffect(() => {
    if (initialData) return;
    let active = true;
    getEventWithStatsAction(eventId).then((result) => {
      if (active) {
        setData(result);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [eventId, initialData]);

  useEffect(() => {
    if (initialTemplates.length > 0) return;
    const orgId = data?.event.organization_id;
    if (!orgId) return;
    let active = true;
    getTemplatesAction(orgId)
      .then((t) => { if (active) setTemplates(t); })
      .catch(() => {});
    return () => { active = false; };
  }, [data?.event.organization_id, initialTemplates.length]);

  useEffect(() => {
    if (initialEmailTemplates.length > 0) return;
    const orgId = data?.event.organization_id;
    if (!orgId) return;
    let active = true;
    getEmailTemplatesAction(orgId)
      .then((t) => { if (active) setEmailTemplates(t); })
      .catch(() => {});
    return () => { active = false; };
  }, [data?.event.organization_id, initialEmailTemplates.length]);

  function switchTab(tab: "details" | "attendees") {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "attendees") url.searchParams.set("tab", "attendees");
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url.toString());
  }

  async function handleNameSave() {
    if (!data || !nameValue.trim()) return;
    setNameSaving(true);
    const { updateEventAction } = await import("@/features/events/server/event.actions");
    const result = await updateEventAction(eventId, { name: nameValue.trim() });
    if (!result?.error && result?.event) {
      setData((prev) => prev ? { ...prev, event: result.event! } : prev);
    }
    setNameSaving(false);
    setEditName(false);
  }

  if (loading) return <SkeletonEventDetail activeTab={initialTab} />;
  if (!data) return <p className="text-red-600 text-sm">Event not found</p>;

  const { event, template, emailTemplate } = data;
  const config = statusConfig[event.status] ?? { label: event.status, badgeClass: "status-badge status-badge--draft", description: "" };
  const showArchiveTip = event.status === "active" && isExpired(event.valid_until);
  const canManageAttendees = event.status === "draft" || event.status === "active";
  const canIssue =
    event.status === "active" &&
    (!event.event_date || new Date() >= new Date(event.event_date));
  const showMissingFieldsWarning =
    event.status === "draft" && (!event.template_id || !event.event_date);

  const missingFields: string[] = [];
  if (!event.template_id) missingFields.push("a template");
  if (!event.event_date) missingFields.push("a Certificate Issue Date");
  const missingFieldsMessage = `Set ${missingFields.join(" and ")} before activating this event.`;

  function handleDataUpdated(event: Event) {
    setData((prev) => prev ? { ...prev, event } : prev);
  }

  function handleTemplateUpdated(event: Event, template: CertificateTemplate | null) {
    setData((prev) => prev ? { ...prev, event, template } : prev);
  }

  function handleEmailTemplateUpdated(event: Event, emailTemplate: CertificateTemplate | null) {
    setData((prev) => prev ? { ...prev, event, emailTemplate } : prev);
  }

  return (
    <div className="space-y-6">
      <div>
        {editName ? (
          <form
            onSubmit={(e) => { e.preventDefault(); handleNameSave(); }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="font-heading text-2xl font-bold tracking-tight input flex-1"
            />
            <button type="submit" className="btn-save" disabled={nameSaving}>
              {nameSaving ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={() => setEditName(false)} className="btn-cancel">
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1
                className={`font-heading text-2xl font-bold tracking-tight text-white ${
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
            <div className="flex shrink-0 items-center gap-2">
              {canDelete && event.status !== "active" && (
                <button
                  type="button"
                  onClick={() => setDeleteDialogOpen(true)}
                  title="Delete event"
                  className="btn-icon btn-icon-danger"
                >
                  <Trash2Icon className="size-4" />
                </button>
              )}
              {canDelete && event.status === "active" && (
                <span
                  title="Active events cannot be deleted"
                  className="btn-icon"
                  aria-disabled="true"
                >
                  <Trash2Icon className="size-4" />
                </span>
              )}
              <span className={`${config.badgeClass} shrink-0`}>{config.label}</span>
            </div>
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

      {showMissingFieldsWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-warning-text)]" />
          <div>
            <p className="font-medium text-[var(--color-warning-text)]">
              Required fields missing
            </p>
            <p className="mt-0.5 text-[var(--color-warning-text)] opacity-80">
              {missingFieldsMessage}
            </p>
          </div>
        </div>
      )}

      <div className="tab-bar">
        {(["details", "attendees"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => switchTab(tab)}
            className={`tab-item ${activeTab === tab ? "tab-item--active" : ""}`}
          >
            {tab === "details" ? "Details" : "Attendees"}
          </button>
        ))}
      </div>

      {activeTab === "details" && (
        <div className="space-y-6">
          <EventFieldsCard event={event} onUpdated={handleDataUpdated} />

          <div className="app-card p-4">
            <p className="section-title mb-3">Status</p>
            <StatusChangeDialog
              event={event}
              open={statusDialogOpen}
              onOpenChange={setStatusDialogOpen}
              onStatusChanged={handleDataUpdated}
            />
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

          <TemplateCard
            event={event}
            templates={templates}
            currentTemplate={template}
            emailTemplates={emailTemplates}
            currentEmailTemplate={emailTemplate}
            onUpdated={handleTemplateUpdated}
            onEmailTemplateUpdated={handleEmailTemplateUpdated}
          />
        </div>
      )}

      {activeTab === "attendees" && (
        <AttendeesTab
          event={event}
          canManageAttendees={canManageAttendees}
          canIssue={canIssue}
        />
      )}

      <DeleteDialog
        event={event}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
}
