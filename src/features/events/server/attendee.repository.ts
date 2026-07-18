import { BaseRepository } from "@/lib/repository/base.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventAttendee } from "@/types/event-attendee";

export class EventAttendeeRepository extends BaseRepository<EventAttendee> {
  constructor(client: SupabaseClient) {
    super("event_attendees", client);
  }

  async findByEventId(eventId: string): Promise<EventAttendee[]> {
    return this.findMany(
      { event_id: eventId },
      { orderBy: "created_at", ascending: true }
    );
  }

  async findByEventAndEmail(
    eventId: string,
    email: string
  ): Promise<EventAttendee | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .eq("event_id", eventId)
      .eq("email", email)
      .single();

    if (error) return null;
    return data as EventAttendee;
  }

  async findCompletedWithoutCertificate(eventId: string): Promise<EventAttendee[]> {
    return this.findMany(
      { event_id: eventId, completed: true },
      { orderBy: "created_at", ascending: true }
    ).then((rows) => rows.filter((r) => !r.certificate_id));
  }

  async countByEventId(eventId: string): Promise<number> {
    return this.count({ event_id: eventId });
  }
}
