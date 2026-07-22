import { Suspense } from "react";
import EventsList from "@/features/events/components/events-list";
import { getCurrentSession, canDelete } from "@/lib/permissions";
import { getEventsPaginated } from "@/features/events/server/event.service";
import { ORG_ID } from "@/lib/org";

const VALID_STATUSES = new Set(["draft", "active", "archive"]);
const PAGE_SIZE = 20;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const { page: pageStr, q: search, status: statusParam } = await searchParams;

  const page = Math.max(0, parseInt(pageStr ?? "1", 10) - 1 || 0);
  const statuses = statusParam
    ? statusParam.split(",").filter((s) => VALID_STATUSES.has(s))
    : undefined;

  const [session, { events, total }] = await Promise.all([
    getCurrentSession(),
    getEventsPaginated(ORG_ID, {
      search: search || undefined,
      statuses,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      columns: "id, name, event_date, location, status",
    }),
  ]);

  const canUserDelete = canDelete(session?.role ?? "participant");
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
      <Suspense fallback={<div className="app-card p-12 text-center"><p className="text-sm text-tertiary">Loading events...</p></div>}>
        <EventsList
          canDelete={canUserDelete}
          events={events}
          total={total}
          page={page}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          search={search ?? ""}
          statusFilter={statusParam ?? ""}
        />
      </Suspense>
    </div>
  );
}
