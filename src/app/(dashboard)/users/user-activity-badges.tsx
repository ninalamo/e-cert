"use client";

import { useEffect, useRef, useState } from "react";
import { AwardIcon } from "lucide-react";
import {
  userActivityApi,
  type UserActivitySummary,
} from "@/lib/api/user-activity";

type LoadState = "idle" | "loading" | "loaded";

export function UserActivityBadges({ email }: { email: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [summary, setSummary] = useState<UserActivitySummary | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let active = true;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setState("loading");
        userActivityApi.summary(email).then((result) => {
          if (!active) return;
          setSummary(result);
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

  if (state !== "loaded" || !summary) {
    return (
      <span
        ref={ref}
        aria-hidden="true"
        className="inline-block h-4 w-14 animate-pulse rounded bg-[var(--color-surface-hover)]"
      />
    );
  }

  const hasActive = summary.certificatesActive > 0;
  const title = `${summary.certificatesActive} active / ${summary.certificatesRevoked} revoked certificate${
    summary.certificatesActive + summary.certificatesRevoked === 1 ? "" : "s"
  }`;

  return (
    <span
      className="flex items-center gap-1 text-xs text-tertiary"
      title={title}
    >
      <AwardIcon
        className={`size-3.5 shrink-0 ${
          hasActive ? "text-[var(--color-success)]" : "opacity-40"
        }`}
      />
      <span className="tabular-nums">{summary.certificatesActive}</span>
      {summary.certificatesRevoked > 0 ? (
        <span className="tabular-nums opacity-60 line-through">
          {summary.certificatesRevoked}
        </span>
      ) : null}
    </span>
  );
}
