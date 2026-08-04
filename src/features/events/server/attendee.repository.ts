import { BaseRepository } from "@/lib/repository/base.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventAttendee, AttendeeMetadata } from "@/types/event-attendee";

function stripFileData(metadata: AttendeeMetadata | null): AttendeeMetadata | null {
  if (!metadata) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { file_data, ...rest } = metadata;
  return rest;
}

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
      console.error(`[AttendeeRepository] Error with FK join for event ${eventId}:`, error);

      const { data: fallback, error: fallbackError } = await this.client
        .from(this.table)
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (fallbackError) {
        console.error(`[AttendeeRepository] Fallback (no join) also failed for event ${eventId}:`, fallbackError);
        return [];
      }

      return (fallback ?? []) as EventAttendee[];
    }

    return (data ?? []) as EventAttendee[];
  }

  async findByEventIdLight(eventId: string): Promise<EventAttendee[]> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*, certificates!certificate_id(revoked_at, expires_at)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(`[AttendeeRepository] Error with light query for event ${eventId}:`, error);

      const { data: fallback, error: fallbackError } = await this.client
        .from(this.table)
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (fallbackError) {
        console.error(`[AttendeeRepository] Light fallback also failed for event ${eventId}:`, fallbackError);
        return [];
      }

      return (fallback ?? []).map((a) => ({
        ...a,
        metadata: stripFileData(a.metadata as AttendeeMetadata),
      })) as EventAttendee[];
    }

    return (data ?? []).map((a) => ({
      ...a,
      metadata: stripFileData(a.metadata as AttendeeMetadata),
    })) as EventAttendee[];
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

  async findByEventAndEmailExists(
    eventId: string,
    email: string
  ): Promise<boolean> {
    const { data, error } = await this.client
      .from(this.table)
      .select("id")
      .eq("event_id", eventId)
      .eq("email", email)
      .single();

    if (error) return false;
    return !!data;
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
