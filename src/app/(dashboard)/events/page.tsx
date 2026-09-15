"use client";

import { useEffect, useMemo, useState } from "react";
import EventsList from "@/features/events/components/events-list";
import { getCurrentGroups } from "@/lib/permissions";
import { hasDashboardAccess } from "@/lib/roles";
import { NotFoundState } from "@/components/not-found-state";
import { eventsApi } from "@/lib/api/events";
import type { Event } from "@/types/event";
import { useSearchParams } from "next/navigation";

const VALID_STATUSES = new Set(["draft", "active", "archive"]);
const PAGE_SIZE = 20;

export default function EventsPage() {
  const searchParams = useSearchParams();
  const pageStr = searchParams.get("page");
  const search = searchParams.get("q") ?? "";
  const statusParam = searchParams.get("status") ?? "";

  const page = Math.max(0, parseInt(pageStr ?? "1", 10) - 1 || 0);
  const statuses = useMemo(() => statusParam
    ? statusParam.split(",").filter((s) => VALID_STATUSES.has(s))
    : undefined
  , [statusParam]);

  const tokenGroups = getCurrentGroups();
  const canUserDelete = tokenGroups.includes("cert-admin");

  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    eventsApi
      .list({
        search: search || undefined,
        statuses,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      .then((result) => {
        if (!active) return;
        setEvents(result.data ?? []);
        setTotal(result.meta?.total ?? 0);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, search, statusParam, statuses]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!hasDashboardAccess(tokenGroups)) {
    return (
      <NotFoundState
        title="Insufficient access"
        description="Your account does not have permission to view events."
        backHref="/my"
        backLabel="Back to My Certificates"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Events
        </h1>
        <p className="mt-1 text-sm text-tertiary">
          Manage your events and issue certificates
        </p>
      </div>
      {loading ? (
        <div className="app-card p-12 text-center">
          <p className="text-sm text-tertiary">Loading events...</p>
        </div>
      ) : (
        <EventsList
          canDelete={canUserDelete}
          events={events}
          total={total}
          page={page}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          search={search}
          statusFilter={statusParam}
        />
      )}
    </div>
  );
}
