"use client";

import { useState } from "react";
import { eventsApi } from "@/lib/api/events";
import { getCurrentGroups, getCurrentSession } from "@/lib/permissions";
import type { Event } from "@/types/event";

export default function VisibilityCard({
  event,
  onVisibilityChanged,
}: {
  event: Event;
  onVisibilityChanged: (event: Event) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = getCurrentSession();
  const groups = getCurrentGroups();
  const isAdmin = groups.includes("cert-admin");
  const isAuthor = !!session && !!event.created_by && session.id === event.created_by;
  // Flip guard mirrors the API (spec §5.1): author or cert-admin only.
  const canFlip = isAdmin || isAuthor;

  async function setVisibility(next: boolean) {
    if (next === event.is_public || saving || !canFlip) return;
    setSaving(true);
    setError(null);
    try {
      const { data: result } = await eventsApi.update(event.id, { is_public: next });
      if (result) {
        onVisibilityChanged(result);
      } else {
        setError("Failed to update visibility");
      }
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Failed to update visibility";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-card p-4">
      <p className="section-title mb-3">Visibility</p>
      <label
        className={`flex items-center gap-2.5 text-[14px] text-secondary ${
          canFlip ? "cursor-pointer" : "cursor-not-allowed opacity-60"
        }`}
        title={canFlip ? undefined : "Only the author or a Vericert Admin can change visibility"}
      >
        <input
          type="checkbox"
          checked={event.is_public}
          disabled={!canFlip || saving}
          onChange={(e) => void setVisibility(e.target.checked)}
          className="size-4 rounded border-border-strong accent-[var(--color-brand-600)]"
        />
        Public event
      </label>
      <p className="mt-1.5 text-[11px] text-tertiary">
        {event.is_public
          ? "Visible to all staff."
          : "Private — only you (and Vericert Admins) can see this event."}
        {!canFlip && " Only the author or a Vericert Admin can change this."}
      </p>
      {error && (
        <p className="mt-2 text-xs text-[var(--color-danger-text)]">{error}</p>
      )}
    </div>
  );
}
