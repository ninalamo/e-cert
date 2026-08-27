"use client";

import { useEffect, useRef, useState } from "react";
import {
  AwardIcon,
  CalendarCheckIcon,
  ChevronDownIcon,
} from "lucide-react";
import {
  userActivityApi,
  type UserActivityDetail,
} from "@/lib/api/user-activity";

type LoadState = "idle" | "loading" | "loaded";

function useActivity(email: string) {
  const ref = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [detail, setDetail] = useState<UserActivityDetail | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let active = true;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setState("loading");
        userActivityApi.detail(email).then((result) => {
          if (!active) return;
          setDetail(result);
          setState("loaded");
        });
      },
      { rootMargin: "80px" }
    );

    observer.observe(el);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [email]);

  return { ref, state, detail };
}

export function UserActivityBadges({
  email,
  expanded = false,
  onToggle,
}: {
  email: string;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const { ref, state, detail } = useActivity(email);

  if (state !== "loaded" || !detail) {
    return (
      <span
        ref={ref}
        aria-hidden="true"
        className="inline-block h-4 w-20 animate-pulse rounded bg-[var(--color-surface-hover)]"
      />
    );
  }

  const hasActive = detail.certificatesActive > 0;

  const badges = (
    <>
      <span className="flex items-center gap-1" title={`${detail.certificatesActive} active / ${detail.certificatesRevoked} revoked certificates`}>
        <AwardIcon
          className={`size-3.5 shrink-0 ${
            hasActive ? "text-[var(--color-success)]" : "opacity-40"
          }`}
        />
        <span className="tabular-nums">{detail.certificatesActive}</span>
        {detail.certificatesRevoked > 0 ? (
          <span className="tabular-nums opacity-60 line-through">
            {detail.certificatesRevoked}
          </span>
        ) : null}
      </span>
      {detail.eventsTotal > 0 ? (
        <span
          className="flex items-center gap-1"
          title={`Attended ${detail.eventsAttended} of ${detail.eventsTotal} event${
            detail.eventsTotal === 1 ? "" : "s"
          }`}
        >
          <CalendarCheckIcon
            className={`size-3.5 shrink-0 ${
              detail.eventsAttended > 0
                ? "text-[var(--color-success)]"
                : "opacity-40"
            }`}
          />
          <span className="tabular-nums">
            {detail.eventsAttended}/{detail.eventsTotal}
          </span>
        </span>
      ) : null}
    </>
  );

  if (!onToggle) {
    return (
      <span ref={ref} className="flex items-center gap-2 text-xs text-tertiary">
        {badges}
      </span>
    );
  }

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type="button"
      onClick={onToggle}
      className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-0.5 text-xs text-tertiary transition-colors hover:bg-[var(--color-surface-hover)]"
      title="Show cert-side records"
    >
      {badges}
      <ChevronDownIcon
        className={`size-3.5 shrink-0 transition-transform ${
          expanded ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}

export function UserActivityDetailPanel({ email }: { email: string }) {
  const [detail, setDetail] = useState<UserActivityDetail | null>(null);

  useEffect(() => {
    let active = true;
    userActivityApi.detail(email).then((result) => {
      if (active) setDetail(result);
    });
    return () => {
      active = false;
    };
  }, [email]);

  if (!detail) return null;

  if (detail.events.length === 0 && detail.certificatesActive === 0 && detail.certificatesRevoked === 0) {
    return (
      <p className="mt-2 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2 text-xs text-tertiary">
        No cert-side records for this email.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-1 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2">
      {detail.events.map((event) => (
        <div
          key={event.id}
          className="flex items-center justify-between gap-3 text-xs"
        >
          <span className="truncate font-medium text-[var(--color-text)]">
            {event.name || "Unnamed event"}
          </span>
          <span className="flex shrink-0 items-center gap-2 text-tertiary">
            <span className={event.attended ? "text-[var(--color-success)]" : "opacity-50"}>
              {event.attended ? "attended" : "not attended"}
            </span>
            {event.completed ? (
              <span className="text-[var(--color-success)]">completed</span>
            ) : null}
            <span
              className={
                !event.hasCertificate
                  ? "opacity-50"
                  : event.certificateRevoked
                    ? "text-[var(--color-danger-text)]"
                    : "text-[var(--color-success)]"
              }
            >
              {!event.hasCertificate
                ? "no certificate"
                : event.certificateRevoked
                  ? "certificate revoked"
                  : "certificate active"}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
