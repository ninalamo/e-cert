import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/events/[id]/bulk-issue/route";
import { createNextRequest } from "../helpers";
import { getCurrentSession } from "@/lib/permissions";
import { start } from "workflow/api";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/events/[id]/bulk-issue", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    const req = createNextRequest("http://localhost:3000/api/events/event-1/bulk-issue", {
      method: "POST",
      body: JSON.stringify({ attendeeIds: ["a1", "a2"] }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 when participant tries to bulk issue", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "participant@test.com", name: "Participant", role: "participant",
    });

    const req = createNextRequest("http://localhost:3000/api/events/event-1/bulk-issue", {
      method: "POST",
      body: JSON.stringify({ attendeeIds: ["a1"] }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 when attendeeIds is missing", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin",
    });

    const req = createNextRequest("http://localhost:3000/api/events/event-1/bulk-issue", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event-1" }) });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("attendeeIds");
  });

  it("returns 400 when attendeeIds is empty", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin",
    });

    const req = createNextRequest("http://localhost:3000/api/events/event-1/bulk-issue", {
      method: "POST",
      body: JSON.stringify({ attendeeIds: [] }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 202 and starts workflow when admin issues", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin",
    });

    const req = createNextRequest("http://localhost:3000/api/events/event-1/bulk-issue", {
      method: "POST",
      body: JSON.stringify({ attendeeIds: ["a1", "a2"], sendEmail: true }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event-1" }) });
    expect(res.status).toBe(202);

    const body = await res.json();
    expect(body).toMatchObject({ runId: "mock-run-id" });
    expect(start).toHaveBeenCalledOnce();
  });

  it("returns 202 when staff issues", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "staff-1", email: "staff@test.com", name: "Staff", role: "staff",
    });

    const req = createNextRequest("http://localhost:3000/api/events/event-1/bulk-issue", {
      method: "POST",
      body: JSON.stringify({ attendeeIds: ["a1"] }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event-1" }) });
    expect(res.status).toBe(202);
  });
});
