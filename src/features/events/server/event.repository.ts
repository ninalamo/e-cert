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

  async findByTemplateId(templateId: string): Promise<Event[]> {
    return this.findMany({ template_id: templateId });
  }

  async findPaginated(
    organizationId: string,
    options: {
      search?: string;
      statuses?: string[];
      limit: number;
      offset: number;
      columns?: string;
    }
  ): Promise<{ events: Event[]; total: number }> {
    const statusFilters = options.statuses?.length ? options.statuses : undefined;

    let q = this.client
      .from(this.table)
      .select(options.columns ?? "*", { count: "exact" });

    q = q.eq("organization_id", organizationId);

    if (statusFilters && statusFilters.length > 0) {
      q = q.in("status", statusFilters);
    }

    if (options.search?.trim()) {
      const term = options.search.trim();
      q = q.or(`name.ilike.%${term}%,location.ilike.%${term}%`);
    }

    const { data, count, error } = await q
      .order("created_at", { ascending: false })
      .range(options.offset, options.offset + options.limit - 1);

    if (error) {
      return { events: [], total: 0 };
    }

    return {
      events: (data ?? []) as Event[],
      total: count ?? 0,
    };
  }
}
