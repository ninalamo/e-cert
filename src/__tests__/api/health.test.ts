import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/health/route";
import { mockQueryResult } from "../helpers";
import { getMockSupabase } from "../setup";

const mockSendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email", () => ({
  getEmailProvider: () => ({ sendEmail: mockSendEmail }),
}));

function createPostRequest(url: string, data: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return new Request(url, { method: "POST", body: formData }) as unknown as NextRequest;
}

beforeEach(() => {
  getMockSupabase()._resetHandlers();
  mockSendEmail.mockClear();
});

describe("GET /api/health", () => {
  it("returns an HTML form with forgot password link", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<form");
    expect(html).toContain('type="password"');
    expect(html).toContain("Forgot password?");
  });
});

describe("POST /api/health", () => {
  it("shows incorrect password when password is wrong", async () => {
    const req = createPostRequest("http://localhost:3000/api/health", {
      action: "login",
      password: "wrong-password",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Incorrect password");
  });

  it("shows incorrect password when password is missing", async () => {
    const req = createPostRequest("http://localhost:3000/api/health", {
      action: "login",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Incorrect password");
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
      action: "login",
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
      action: "login",
      password: "password123",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("missing");
  });

  it("sends password email on forgot action", async () => {
    const req = createPostRequest("http://localhost:3000/api/health", {
      action: "forgot",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.any(String),
        subject: "Admin Master Reset Password Reminder",
      })
    );

    const html = await res.text();
    expect(html).toContain("Password has been emailed");
  });
});
