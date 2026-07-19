import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInsert = Record<string, any>;

export abstract class BaseRepository<T> {
  protected table: string;
  protected client: SupabaseClient;

  constructor(table: string, client: SupabaseClient) {
    this.table = table;
    this.client = client;
  }

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as T;
  }

  async findMany(
    filters?: Record<string, unknown>,
    options?: { orderBy?: string; ascending?: boolean; limit?: number; offset?: number }
  ): Promise<T[]> {
    let query = this.client.from(this.table).select("*");

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    }

    if (options?.limit) {
      query = query.range(options.offset ?? 0, (options.offset ?? 0) + options.limit - 1);
    }

    const { data, error } = await query;
    if (error) return [];
    return (data ?? []) as T[];
  }

  async create(data: Partial<T>): Promise<{ data: T | null; error: string | null }> {
    const { data: created, error } = await this.client
      .from(this.table)
      .insert(data as SupabaseInsert)
      .select()
      .single();

    if (error) {
      console.error(`[${this.table}] create error:`, error.message, error.details, error.hint);
      return { data: null, error: error.message };
    }
    return { data: created as T, error: null };
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const { data: updated, error } = await this.client
      .from(this.table)
      .update(data as SupabaseInsert)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`[${this.table}] update error:`, error.message, error.details, error.hint, error.code);
      return null;
    }
    return updated as T;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.client
      .from(this.table)
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`[${this.table}] delete error:`, error.message, error.details, error.hint, error.code);
    }
    return !error;
  }

  async count(filters?: Record<string, unknown>): Promise<number> {
    let query = this.client
      .from(this.table)
      .select("*", { count: "exact", head: true });

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  }
}
