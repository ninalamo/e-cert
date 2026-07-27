import { vi } from "vitest";

type QueryResult = { data: unknown; error: unknown } | { data: unknown; count: number; error: unknown };

export interface QueryBuilder {
  select: (...args: unknown[]) => QueryBuilder;
  in: (...args: unknown[]) => QueryBuilder;
  eq: (...args: unknown[]) => QueryBuilder;
  is: (...args: unknown[]) => QueryBuilder;
  not: (column: string, operator: string, value: unknown) => QueryBuilder;
  single: () => QueryResult;
  maybeSingle: () => QueryResult;
  order: (column: string, opts?: { ascending?: boolean }) => QueryBuilder;
  limit: (n: number) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  insert: (data: unknown) => QueryBuilder;
  upsert: (data: unknown, opts?: unknown) => QueryBuilder;
  update: (data: unknown) => QueryBuilder;
  delete: () => QueryBuilder;
  then: (resolve: (val: QueryResult) => void) => void;
}

export function mockQueryResult<T>(result: T): QueryBuilder {
  const builder: QueryBuilder = {
    select: () => builder,
    in: () => builder,
    eq: () => builder,
    is: () => builder,
    not: () => builder,
    single: () => ({ data: result, error: null }),
    maybeSingle: () => ({ data: result, error: null }),
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    insert: () => builder,
    upsert: () => builder,
    update: () => builder,
    delete: () => builder,
    then(resolve) {
      resolve({ data: result, error: null });
    },
  };
  return builder;
}

export function mockQueryError(error: string): QueryBuilder {
  const builder: QueryBuilder = {
    select: () => builder,
    in: () => builder,
    eq: () => builder,
    is: () => builder,
    not: () => builder,
    single: () => ({ data: null, error: new Error(error) }),
    maybeSingle: () => ({ data: null, error: new Error(error) }),
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    insert: () => builder,
    upsert: () => builder,
    update: () => builder,
    delete: () => builder,
    then(resolve) {
      resolve({ data: null, error: new Error(error) });
    },
  };
  return builder;
}

export function createMockSupabaseClient() {
  const handlers: Map<string, QueryBuilder> = new Map();
  const seqPointers: Map<string, number> = new Map();

  const storageHandlers: Map<string, { list: unknown; remove: unknown }> = new Map();
  const currentMock = { from: vi.fn(), storage: { from: vi.fn() } };

  function getBuilder(table: string): QueryBuilder {
    const h = handlers.get(table);
    if (!h) return mockQueryResult([]);

    if (Array.isArray(h)) {
      const idx = seqPointers.get(table) ?? 0;
      const next = (h as QueryBuilder[])[idx] ?? mockQueryResult([]);
      seqPointers.set(table, idx + 1);
      return next;
    }

    return h as QueryBuilder;
  }

  const client = {
    from: vi.fn((table: string) => {
      currentMock.from(table);
      return getBuilder(table);
    }),
    storage: {
      from: vi.fn((bucket: string) => {
        currentMock.storage.from(bucket);
        const h = storageHandlers.get(bucket) ?? { list: [], remove: { data: [], error: null } };
        return {
          list: vi.fn(() => Promise.resolve(h.list)),
          remove: vi.fn(() => Promise.resolve(h.remove)),
        };
      }),
    },
    _setHandler(table: string, builder: QueryBuilder | QueryBuilder[]) {
      handlers.set(table, builder as QueryBuilder);
    },
    _setStorageHandler(
      bucket: string,
      handler: { list: unknown; remove: unknown }
    ) {
      storageHandlers.set(bucket, handler);
    },
    _resetHandlers() {
      handlers.clear();
      storageHandlers.clear();
      seqPointers.clear();
      vi.clearAllMocks();
    },
  };

  return client;
}
