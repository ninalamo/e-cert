import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "@/app/api/health/route";
import { createNextRequest, mockQueryResult } from "../helpers";
import { getMockSupabase } from "../setup";

beforeEach(() => {
  getMockSupabase()._resetHandlers();
  vi.clearAllMocks();
});

describe("GET /api/health", () => {
  it("returns 403 when x-health-password header is missing", async () => {
    const req = createNextRequest("http://localhost:3000/api/health");
    const res = await GET(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "Forbidden" });
  });

  it("returns 403 when x-health-password is wrong", async () => {
    const req = createNextRequest("http://localhost:3000/api/health", {
      headers: { "x-health-password": "wrong-password" },
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns 200 with seeded users when authorized", async () => {
    const users = [
      { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", email: "admin@lyceumalabang.edu.ph", name: "Admin User", created_at: "2024-01-01T00:00:00Z", banned_until: null },
      { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", email: "staff@lyceumalabang.edu.ph", name: "Staff User", created_at: "2024-01-01T00:00:00Z", banned_until: null },
      { id: "cccccccc-cccc-cccc-cccc-ccccccccccc3", email: "participant@lyceumalabang.edu.ph", name: "Participant User", created_at: "2024-01-01T00:00:00Z", banned_until: null },
    ];

    const memberships = [
      { user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", role: "admin", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
      { user_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", role: "staff", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
      { user_id: "cccccccc-cccc-cccc-cccc-ccccccccccc3", role: "participant", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    ];

    getMockSupabase()._setHandler("users", mockQueryResult(users));
    getMockSupabase()._setHandler("user_memberships", mockQueryResult(memberships));

    const req = createNextRequest("http://localhost:3000/api/health", {
      headers: { "x-health-password": "password123" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      status: "ok",
      auth: "up",
    });
    expect(body.users).toHaveLength(3);
    expect(body.users[0]).toMatchObject({
      email: "admin@lyceumalabang.edu.ph",
      name: "Admin User",
      role: "admin",
    });
    expect(body.missing).toEqual([]);
  });

  it("returns 500 when supabase query fails", async () => {
    getMockSupabase()._setHandler("users", mockQueryResult(null));
    getMockSupabase()._setHandler("user_memberships", mockQueryResult([]));

    const req = createNextRequest("http://localhost:3000/api/health", {
      headers: { "x-health-password": "password123" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.missing).toHaveLength(3);
  });
});

describe("PUT /api/health", () => {
  it("returns 403 when x-health-password header is missing", async () => {
    const req = createNextRequest("http://localhost:3000/api/health", {
      method: "PUT",
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it("returns 200 and reseeds when authorized", async () => {
    const { reseed } = await import("@/lib/seed");

    const users = [
      { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", email: "admin@lyceumalabang.edu.ph", name: "Admin User", created_at: "2024-01-01T00:00:00Z", banned_until: null },
    ];
    const memberships = [
      { user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", role: "admin", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    ];

    getMockSupabase()._setHandler("users", mockQueryResult(users));
    getMockSupabase()._setHandler("user_memberships", mockQueryResult(memberships));

    const req = createNextRequest("http://localhost:3000/api/health", {
      method: "PUT",
      headers: { "x-health-password": "password123" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(reseed).toHaveBeenCalledOnce();

    const body = await res.json();
    expect(body).toMatchObject({
      status: "ok",
      message: "Reseeded default users",
    });
  });
});
