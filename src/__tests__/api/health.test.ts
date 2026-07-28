import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/health/route";
import { mockQueryResult } from "../helpers";
import { getMockSupabase } from "../setup";

function createPostRequest(url: string, data: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  const req = new Request(url, { method: "POST", body: formData });
  // Prevent caching of password in the form
  req.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  req.headers.set("Pragma", "no-cache");
  req.headers.set("Expires", "0");
  return req as unknown as NextRequest;
}

beforeEach(() => {
  getMockSupabase()._resetHandlers();
});

describe("GET /api/health", () => {
  it("returns an HTML form with email and password fields", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<form");
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain("Reset Admin Password");
  });
});

describe("POST /api/health", () => {
  it("shows email is wrong when email is wrong", async () => {
    const req = createPostRequest("http://localhost:3000/api/health", {
      email: "wrong@example.com",
      password: "password123",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("email is wrong");
  });

  it("shows password is wrong when password is wrong", async () => {
    const req = createPostRequest("http://localhost:3000/api/health", {
      email: "admin@lyceumalabang.edu.ph",
      password: "wrong-password",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("password is wrong");
  });

  it("shows missing fields when email or password is missing", async () => {
    const req = createPostRequest("http://localhost:3000/api/health", {
      email: "admin@lyceumalabang.edu.ph",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Please provide both email and password");
  });

  it("successfully recreates all users when credentials are valid", async () => {
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

    const req = createPostRequest("http://localhost:3000/api/health", {
      email: "admin@lyceumalabang.edu.ph",
      password: "password123",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain("✓ Admin credentials verified and all users re-seeded successfully!");
    expect(html).toContain("All seeded users (admin, staff, participant) have been recreated");
  });

  it("returns seeded users when authorized", async () => {
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

    const req = createPostRequest("http://localhost:3000/api/health", {
      email: "admin@lyceumalabang.edu.ph",
      password: "password123",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain("admin@lyceumalabang.edu.ph");
    expect(html).toContain("staff@lyceumalabang.edu.ph");
    expect(html).toContain("participant@lyceumalabang.edu.ph");
    expect(html).toContain("admin");
    expect(html).toContain("staff");
    expect(html).toContain("participant");
  });

  it("shows missing users when supabase query fails", async () => {
    getMockSupabase()._setHandler("users", mockQueryResult(null));
    getMockSupabase()._setHandler("user_memberships", mockQueryResult([]));

    const req = createPostRequest("http://localhost:3000/api/health", {
      email: "admin@lyceumalabang.edu.ph",
      password: "password123",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("missing");
  });
});
