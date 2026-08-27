"use client";

import { useEffect, useMemo, useState } from "react";
import EventsList from "@/features/events/components/events-list";
import { parseAccessToken, getAccessToken } from "@/lib/auth";
import { canDelete } from "@/lib/permissions";
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

  const token = getAccessToken();
  const parsed = token ? parseAccessToken(token) : null;
  const permissions = parsed?.permissions ?? [];
  const hasAdmin = permissions.some((p: string) => p.startsWith("admin:"));
  const canUserDelete = canDelete(hasAdmin ? "admin" : "participant");

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
