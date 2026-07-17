import { BaseRepository } from "@/lib/repository/base.repository";
import type { Event } from "@/types/event";

export class EventRepository extends BaseRepository<Event> {
  constructor() {
    super("events");
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
