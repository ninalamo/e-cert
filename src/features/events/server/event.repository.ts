import { BaseRepository } from "@/lib/repository/base.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Event } from "@/types/event";

export class EventRepository extends BaseRepository<Event> {
  constructor(client: SupabaseClient) {
    super("events", client);
  }

  async findByOrganizationId(organizationId: string): Promise<Event[]> {
    return this.findMany(
      { organization_id: organizationId },
      { orderBy: "created_at", ascending: false }
    );
  }

  async findByOrganizationAndStatus(
    organizationId: string,
    status: string
  ): Promise<Event[]> {
    return this.findMany(
      { organization_id: organizationId, status },
      { orderBy: "event_date", ascending: false }
    );
  }
}
