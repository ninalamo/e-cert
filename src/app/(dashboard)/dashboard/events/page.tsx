import EventsList from "@/features/events/components/events-list";

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Events</h1>
        <p className="text-muted-foreground text-sm">
          Manage your events and issue certificates
        </p>
      </div>
      <EventsList />
    </div>
  );
}

