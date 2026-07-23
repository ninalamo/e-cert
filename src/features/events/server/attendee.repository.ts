import { BaseRepository } from "@/lib/repository/base.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventAttendee } from "@/types/event-attendee";

export class EventAttendeeRepository extends BaseRepository<EventAttendee> {
  constructor(client: SupabaseClient) {
    super("event_attendees", client);
  }

  async findByEventId(eventId: string): Promise<EventAttendee[]> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*, certificates!certificate_id(revoked_at, expires_at)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(`[AttendeeRepository] Error fetching attendees for event ${eventId}:`, error);
      return [];
    }

    console.log(`[AttendeeRepository] Raw response for event ${eventId}: rows=${data?.length ?? 0}`, JSON.stringify(data ?? []));

    return (data ?? []) as EventAttendee[];
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

  async findWithoutCertificate(eventId: string): Promise<EventAttendee[]> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*, certificates!certificate_id(revoked_at, expires_at)")
      .eq("event_id", eventId)
      .is("certificate_id", null)
      .order("created_at", { ascending: true });

    if (error) return [];
    return (data ?? []) as EventAttendee[];
  }

  async countByEventId(eventId: string): Promise<number> {
    return this.count({ event_id: eventId });
  }
}
