import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/certificates/[id]/view-data/route";
import { createNextRequest, mockQueryResult, mockQueryError } from "../helpers";
import { getMockSupabase } from "../setup";

beforeEach(() => {
  getMockSupabase()._resetHandlers();
  vi.clearAllMocks();
});

const mockCertificate = {
  id: "cert-1",
  certificate_number: "CERT-2024-0001",
  recipient_name: "John Doe",
  recipient_email: "john@example.com",
  issued_at: "2024-06-15T00:00:00Z",
  expires_at: null,
  revoked_at: null,
  template_id: "template-1",
  event_id: "event-1",
  organization_id: "org-1",
  metadata: {},
};

const mockTemplate = {
  id: "template-1",
  name: "Graduation Certificate",
  html_content: "<div>Template</div>",
  css_content: ".certificate { color: red; }",
};

const mockEvent = {
  id: "event-1",
  name: "Graduation 2024",
  event_date: "2024-06-15",
};

describe("GET /api/certificates/[id]/view-data", () => {
  it("returns 200 with certificate, template, event, and qr", async () => {
    getMockSupabase()._setHandler("certificates", mockQueryResult(mockCertificate));
    getMockSupabase()._setHandler("certificate_templates", mockQueryResult(mockTemplate));
    getMockSupabase()._setHandler("events", mockQueryResult(mockEvent));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/view-data");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.certificate).toMatchObject({ id: "cert-1", certificate_number: "CERT-2024-0001" });
    expect(body.template).toMatchObject({ id: "template-1" });
    expect(body.event).toMatchObject({ id: "event-1" });
    expect(body.qrDataUrl).toBe("data:image/png;base64,fakeqr");
    expect(body.orgName).toBe("Lyceum Of Alabang");
  });

  it("returns 404 when certificate not found", async () => {
    getMockSupabase()._setHandler("certificates", mockQueryError("Not found"));

    const req = createNextRequest("http://localhost:3000/api/certificates/unknown/view-data");
    const res = await GET(req, { params: Promise.resolve({ id: "unknown" }) });
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body).toEqual({ error: "Certificate not found" });
  });

  it("returns 410 when certificate is revoked", async () => {
    const revoked = { ...mockCertificate, revoked_at: "2024-07-01T00:00:00Z" };
    getMockSupabase()._setHandler("certificates", mockQueryResult(revoked));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/view-data");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(410);

    const body = await res.json();
    expect(body).toEqual({ error: "Certificate has been revoked" });
  });

  it("handles missing template_id and event_id gracefully", async () => {
    const minimalCert = { ...mockCertificate, template_id: null, event_id: null };
    getMockSupabase()._setHandler("certificates", mockQueryResult(minimalCert));

    const req = createNextRequest("http://localhost:3000/api/certificates/cert-1/view-data");
    const res = await GET(req, { params: Promise.resolve({ id: "cert-1" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.template).toBeNull();
    expect(body.event).toBeNull();
  });
});
