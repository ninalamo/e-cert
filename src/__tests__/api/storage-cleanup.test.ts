import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/storage/cleanup/route";
import { createNextRequest, mockQueryResult } from "../helpers";
import { getMockSupabase } from "../setup";
import { requireRole } from "@/lib/permissions";

beforeEach(() => {
  getMockSupabase()._resetHandlers();
  vi.clearAllMocks();
});

function mockStorageList(files: { name: string }[]) {
  getMockSupabase()._setStorageHandler("certificates", {
    list: { data: files, error: null },
    remove: { data: [], error: null },
  });
}

describe("DELETE /api/storage/cleanup", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireRole).mockResolvedValue(null as any);

    const req = createNextRequest("http://localhost:3000/api/storage/cleanup", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 with removed count when admin calls cleanup", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin",
    });

    mockStorageList([
      { name: "orphan-1.pdf" },
      { name: "orphan-2.pdf" },
    ]);
    getMockSupabase()._setHandler("certificates", mockQueryResult([
      { file_path: "active-1.pdf" },
    ]));

    const req = createNextRequest("http://localhost:3000/api/storage/cleanup", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({ removed: 2, checked: 2 });
  });

  it("returns 200 with 0 removed when no orphan files", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin",
    });

    mockStorageList([
      { name: "active-1.pdf" },
    ]);
    getMockSupabase()._setHandler("certificates", mockQueryResult([
      { file_path: "active-1.pdf" },
    ]));

    const req = createNextRequest("http://localhost:3000/api/storage/cleanup", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({ removed: 0, checked: 1 });
  });

  it("returns 200 with 0 checked when storage is empty", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin",
    });

    mockStorageList([]);

    const req = createNextRequest("http://localhost:3000/api/storage/cleanup", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({ removed: 0, checked: 0 });
  });

  it("returns 500 when storage list fails", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin",
    });

    getMockSupabase()._setStorageHandler("certificates", {
      list: { data: null, error: { message: "Storage unavailable" } },
      remove: { data: [], error: null },
    });

    const req = createNextRequest("http://localhost:3000/api/storage/cleanup", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toContain("Failed to list storage");
  });
});
