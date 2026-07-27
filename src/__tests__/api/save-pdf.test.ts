import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/certificates/[id]/save-pdf/route";
import { createNextRequest, mockQueryResult, mockQueryError } from "../helpers";
import { getMockSupabase } from "../setup";
import { getCurrentSession } from "@/lib/permissions";

beforeEach(() => {
  getMockSupabase()._resetHandlers();
  vi.clearAllMocks();
});

const baseCert = {
  id: "cert-1",
  certificate_number: "CERT-2024-0001",
  recipient_name: "John Doe",
  recipient_email: "john@example.com",
  metadata: {},
};

describe("POST /api/certificates/[id]/save-pdf", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/save-pdf", {
      method: "POST",
      body: JSON.stringify({ pdf_base64: "fakebase64" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when certificate not found", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "admin@test.com", name: "Admin", role: "admin",
    });
    getMockSupabase()._setHandler("certificates", mockQueryError("Not found"));

    const req = createNextRequest("http://localhost:3000/api/certificates/unknown/save-pdf", {
      method: "POST",
      body: JSON.stringify({ pdf_base64: "fakebase64" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "unknown" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when participant tries to save to another's certificate", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-2", email: "other@example.com", name: "Other", role: "participant",
    });
    getMockSupabase()._setHandler("certificates", mockQueryResult(baseCert));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/save-pdf", {
      method: "POST",
      body: JSON.stringify({ pdf_base64: "fakebase64" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 when pdf_base64 is missing", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin",
    });
    getMockSupabase()._setHandler("certificates", mockQueryResult(baseCert));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/save-pdf", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("Missing pdf_base64");
  });

  it("returns 200 and updates metadata when admin saves pdf", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin",
    });

    const existingCert = { ...baseCert, metadata: { existing_field: "value" } };
    getMockSupabase()._setHandler("certificates", mockQueryResult(existingCert));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/save-pdf", {
      method: "POST",
      body: JSON.stringify({ pdf_base64: "newbase64" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ success: true });
  });

  it("returns 200 when participant saves to their own certificate", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "john@example.com", name: "John", role: "participant",
    });
    getMockSupabase()._setHandler("certificates", mockQueryResult(baseCert));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/save-pdf", {
      method: "POST",
      body: JSON.stringify({ pdf_base64: "mybase64" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(200);
  });
});
