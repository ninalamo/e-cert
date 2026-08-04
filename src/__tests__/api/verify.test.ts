import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { GET } from "@/app/api/verify/[number]/route";
import { createNextRequest, mockQueryResult, mockQueryError } from "../helpers";
import { getMockSupabase } from "../setup";

beforeEach(() => {
  getMockSupabase()._resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  vi.useRealTimers();
});

const baseCert = {
  certificate_number: "CERT-2024-0001",
  issued_at: "2024-06-15T00:00:00Z",
  expires_at: null,
  revoked_at: null,
  recipient_name: "John Doe",
  events: { name: "Graduation 2024" },
  organizations: { name: "Lyceum Of Alabang" },
};

function buildUrl(number: string) {
  return `http://localhost:3000/api/verify/${number}`;
}

describe("GET /api/verify/[number]", () => {
  it("returns 200 with active certificate details", async () => {
    getMockSupabase()._setHandler("certificates", mockQueryResult(baseCert));

    const req = createNextRequest(buildUrl("CERT-2024-0001"));
    const res = await GET(req, { params: Promise.resolve({ number: "CERT-2024-0001" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      valid: true,
      certificate_number: "CERT-2024-0001",
      issued_date: "2024-06-15T00:00:00Z",
      valid_until: null,
      status: "active",
      recipient_name: "John Doe",
      organization: { name: "Lyceum Of Alabang" },
      event_name: "Graduation 2024",
    });
  });

  it("returns 404 when certificate is not found", async () => {
    getMockSupabase()._setHandler("certificates", mockQueryError("Certificate not found"));

    const req = createNextRequest(buildUrl("NONEXISTENT"));
    const res = await GET(req, { params: Promise.resolve({ number: "NONEXISTENT" }) });
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body).toEqual({
      valid: false,
      error: "Certificate not found",
    });
  });

  it("returns status revoked when revoked_at is set", async () => {
    const revokedCert = {
      ...baseCert,
      revoked_at: "2024-07-01T00:00:00Z",
    };
    getMockSupabase()._setHandler("certificates", mockQueryResult(revokedCert));

    const req = createNextRequest(buildUrl("CERT-2024-0001"));
    const res = await GET(req, { params: Promise.resolve({ number: "CERT-2024-0001" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("revoked");
    expect(body.valid).toBe(false);
  });

  it("returns status expired when expires_at is in the past", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01"));

    const expiredCert = {
      ...baseCert,
      expires_at: "2024-12-31T00:00:00Z",
    };
    getMockSupabase()._setHandler("certificates", mockQueryResult(expiredCert));

    const req = createNextRequest(buildUrl("CERT-2024-0001"));
    const res = await GET(req, { params: Promise.resolve({ number: "CERT-2024-0001" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("expired");
    expect(body.valid).toBe(false);
    expect(body.valid_until).toBe("2024-12-31T00:00:00Z");
  });

  it("returns event_name as null when no event", async () => {
    const noEventCert = {
      ...baseCert,
      events: null,
    };
    getMockSupabase()._setHandler("certificates", mockQueryResult(noEventCert));

    const req = createNextRequest(buildUrl("CERT-2024-0001"));
    const res = await GET(req, { params: Promise.resolve({ number: "CERT-2024-0001" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.event_name).toBeNull();
  });

  it("includes cache control headers", async () => {
    getMockSupabase()._setHandler("certificates", mockQueryResult(baseCert));

    const req = createNextRequest(buildUrl("CERT-2024-0001"));
    const res = await GET(req, { params: Promise.resolve({ number: "CERT-2024-0001" }) });

    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=300, stale-while-revalidate=600");
  });
});
