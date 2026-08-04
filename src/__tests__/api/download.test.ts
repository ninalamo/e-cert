import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/certificates/[id]/download/route";
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
  issued_at: "2024-06-15T00:00:00Z",
  expires_at: null,
  revoked_at: null,
  template_id: null,
  event_id: null,
  organization_id: "org-1",
  file_path: null,
  metadata: {},
};

describe("GET /api/certificates/[id]/download", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/download");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when certificate not found", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "admin@test.com", name: "Admin", role: "admin",
    });
    getMockSupabase()._setHandler("certificates", mockQueryError("Not found"));

    const req = createNextRequest("http://localhost:3000/api/certificates/unknown/download");
    const res = await GET(req, { params: Promise.resolve({ id: "unknown" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when participant tries to download another's certificate", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-2", email: "other@example.com", name: "Other", role: "participant",
    });
    getMockSupabase()._setHandler("certificates", mockQueryResult(baseCert));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/download");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 200 when admin downloads any certificate", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin",
    });

    const cachedPdf = Buffer.from("%PDF-admin-download").toString("base64");
    getMockSupabase()._setHandler("certificates", mockQueryResult({
      ...baseCert,
      metadata: { rendered_pdf: cachedPdf },
    }));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/download");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("returns 200 when staff downloads any certificate", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "staff-1", email: "staff@test.com", name: "Staff", role: "staff",
    });

    const cachedPdf = Buffer.from("%PDF-staff-download").toString("base64");
    getMockSupabase()._setHandler("certificates", mockQueryResult({
      ...baseCert,
      metadata: { rendered_pdf: cachedPdf },
    }));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/download");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 200 when participant downloads their own certificate", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "john@example.com", name: "John", role: "participant",
    });

    const cachedPdf = Buffer.from("%PDF-own").toString("base64");
    getMockSupabase()._setHandler("certificates", mockQueryResult({
      ...baseCert,
      metadata: { rendered_pdf: cachedPdf },
    }));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/download");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 410 when certificate is revoked", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin",
    });
    getMockSupabase()._setHandler("certificates", mockQueryResult({
      ...baseCert,
      revoked_at: "2024-07-01T00:00:00Z",
    }));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/download");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(410);
  });

  it("returns 410 when certificate is expired", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin",
    });
    getMockSupabase()._setHandler("certificates", mockQueryResult({
      ...baseCert,
      expires_at: "2024-12-31T00:00:00Z",
    }));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/download");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(410);
  });

  it("returns 404 when no PDF source is available", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin",
    });
    getMockSupabase()._setHandler("certificates", mockQueryResult(baseCert));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/download");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toContain("PDF not available");
  });
});
