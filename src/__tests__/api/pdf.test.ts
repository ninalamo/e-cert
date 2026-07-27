import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/certificates/[id]/pdf/route";
import { createNextRequest, mockQueryResult, mockQueryError } from "../helpers";
import { getMockSupabase } from "../setup";
import { getCurrentSession } from "@/lib/permissions";
import { getCertificatePdfBuffer } from "@/features/certificates/server/certificate.service";

vi.mock("@/features/certificates/server/certificate.service", async () => {
  const actual = await vi.importActual<typeof import("@/features/certificates/server/certificate.service")>(
    "@/features/certificates/server/certificate.service"
  );
  return {
    ...actual,
    getCertificatePdfBuffer: vi.fn(),
  };
});

beforeEach(() => {
  getMockSupabase()._resetHandlers();
  vi.clearAllMocks();
});

const mockCert = {
  id: "cert-1",
  certificate_number: "CERT-2024-0001",
  recipient_name: "John",
  recipient_email: "john@example.com",
  metadata: {},
  revoked_at: null,
  template_id: null,
  event_id: null,
  organization_id: "org-1",
  issued_at: "2024-06-15T00:00:00Z",
};

describe("GET /api/certificates/[id]/pdf", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when certificate not found", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "user@test.com", name: "User", role: "admin",
    });
    getMockSupabase()._setHandler("certificates", mockQueryError("Not found"));

    const req = createNextRequest("http://localhost:3000/api/certificates/unknown/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "unknown" }) });
    expect(res.status).toBe(404);
  });

  it("returns PDF buffer when cached rendered_pdf exists in metadata", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "user@test.com", name: "User", role: "admin",
    });

    const cachedPdfBase64 = Buffer.from("%PDF-test-content").toString("base64");
    const cert = {
      ...mockCert,
      metadata: { rendered_pdf: cachedPdfBase64 },
    };
    getMockSupabase()._setHandler("certificates", mockQueryResult(cert));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("CERT-2024-0001.pdf");

    const buffer = await res.arrayBuffer();
    expect(new Uint8Array(buffer)[0]).toBe(0x25); // '%'
  });

  it("falls back to getCertificatePdfBuffer when no cached pdf", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "user@test.com", name: "User", role: "admin",
    });

    getMockSupabase()._setHandler("certificates", mockQueryResult(mockCert));
    vi.mocked(getCertificatePdfBuffer).mockResolvedValue({
      data: Buffer.from("%PDF-fresh"),
      error: null,
    });

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("returns 404 when getCertificatePdfBuffer returns error", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "user@test.com", name: "User", role: "admin",
    });

    getMockSupabase()._setHandler("certificates", mockQueryResult(mockCert));
    vi.mocked(getCertificatePdfBuffer).mockResolvedValue({
      data: null,
      error: "PDF not found",
    });

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toContain("PDF not available");
  });
});
