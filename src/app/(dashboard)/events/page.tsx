import EventsList from "@/features/events/components/events-list";
import { getCurrentSession, canDelete } from "@/lib/permissions";

export default async function EventsPage() {
  const session = await getCurrentSession();
  const canUserDelete = canDelete(session?.role ?? "participant");

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
      <EventsList canDelete={canUserDelete} />
    </div>
  );
}
