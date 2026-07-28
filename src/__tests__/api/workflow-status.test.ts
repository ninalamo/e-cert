import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/workflow-status/route";
import { createNextRequest } from "../helpers";
import { getRun } from "workflow/api";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/workflow-status", () => {
  it("returns 400 when runId is missing", async () => {
    const req = createNextRequest("http://localhost:3000/api/workflow-status");
    const res = await GET(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("runId is required");
  });

  it("returns 404 when workflow run does not exist", async () => {
    vi.mocked(getRun).mockReturnValue({
      exists: Promise.resolve(false),
      status: Promise.resolve("unknown"),
    } as ReturnType<typeof getRun>);

    const req = createNextRequest("http://localhost:3000/api/workflow-status?runId=nonexistent");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns status and result when workflow completed", async () => {
    vi.mocked(getRun).mockReturnValue({
      exists: Promise.resolve(true),
      status: Promise.resolve("completed"),
      returnValue: Promise.resolve({ issued: 5, failed: 0 }),
    } as ReturnType<typeof getRun>);

    const req = createNextRequest("http://localhost:3000/api/workflow-status?runId=run-1");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      status: "completed",
      result: { issued: 5, failed: 0 },
    });
  });

  it("returns status error when workflow failed", async () => {
    vi.mocked(getRun).mockReturnValue({
      exists: Promise.resolve(true),
      status: Promise.resolve("failed"),
    } as ReturnType<typeof getRun>);

    const req = createNextRequest("http://localhost:3000/api/workflow-status?runId=run-1");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ status: "failed", error: "Workflow failed" });
  });

  it("returns pending status when workflow is still running", async () => {
    vi.mocked(getRun).mockReturnValue({
      exists: Promise.resolve(true),
      status: Promise.resolve("running"),
    } as ReturnType<typeof getRun>);

    const req = createNextRequest("http://localhost:3000/api/workflow-status?runId=run-1");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ status: "running" });
  });
});
