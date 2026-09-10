import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/v1/[...path]/route.ts";

const CERT_API = "https://cert-api.lyceumalabang.edu.ph";
const AUTH_API = "https://auth.lyceumalabang.edu.ph";

function makeRequest(
  path: string,
  opts?: { method?: string; body?: string; headers?: Record<string, string> }
) {
  const url = `http://localhost:3000/api/v1/${path}`;
  return new NextRequest(url, {
    method: opts?.method ?? "GET",
    headers: opts?.headers,
    body: opts?.body,
  });
}

function mockFetchSuccess(body = '{"ok":true}', status = 200) {
  const res = new Response(body, {
    status,
    headers: { "content-type": "application/json" },
  });
  return vi.fn().mockResolvedValue(res);
}

function mockFetchFailure(message = "network error") {
  return vi.fn().mockRejectedValue(new Error(message));
}

describe("BFF proxy route handler", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Routing: auth SSO routes → CERT_API ────────────────────────

  it.each(["auth/callback", "auth/refresh", "auth/logout"])(
    "POST /api/v1/%s → CERT_API_URL",
    async (path) => {
      fetchSpy = mockFetchSuccess();
      vi.stubGlobal("fetch", fetchSpy);

      const req = makeRequest(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload: "test" }),
      });

      await POST(req, { params: Promise.resolve({ path: path.split("/") }) });

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [targetUrl] = fetchSpy.mock.calls[0];
      expect(targetUrl).toContain(CERT_API);
      expect(targetUrl).toContain(`/api/v1/${path}`);
    }
  );

  // ─── Routing: auth platform routes → AUTH_API ───────────────────

  it.each(["auth/login", "auth/register"])(
    "POST /api/v1/%s → AUTH_API_URL",
    async (path) => {
      fetchSpy = mockFetchSuccess();
      vi.stubGlobal("fetch", fetchSpy);

      const req = makeRequest(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test@test.com" }),
      });

      await POST(req, { params: Promise.resolve({ path: path.split("/") }) });

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [targetUrl] = fetchSpy.mock.calls[0];
      expect(targetUrl).toContain(AUTH_API);
      expect(targetUrl).toContain(`/api/v1/${path}`);
    }
  );

  // ─── Routing: non-auth routes → CERT_API ────────────────────────

  it("GET /api/v1/events → CERT_API_URL", async () => {
    fetchSpy = mockFetchSuccess('{"data":[],"meta":{"total":0}}');
    vi.stubGlobal("fetch", fetchSpy);

    const req = makeRequest("events");
    await GET(req, { params: Promise.resolve({ path: ["events"] }) });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [targetUrl] = fetchSpy.mock.calls[0];
    expect(targetUrl).toContain(CERT_API);
    expect(targetUrl).toContain("/api/v1/events");
  });

  // ─── Empty path → 400 ──────────────────────────────────────────

  it("returns 400 for empty path", async () => {
    const req = makeRequest("");
    const res = await GET(req, { params: Promise.resolve({ path: [] }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.status).toBe("error");
  });

  // ─── Fetch failure → 502 ───────────────────────────────────────

  it("returns 502 when upstream is unreachable", async () => {
    fetchSpy = mockFetchFailure("fetch failed");
    vi.stubGlobal("fetch", fetchSpy);

    const req = makeRequest("events");
    const res = await GET(req, { params: Promise.resolve({ path: ["events"] }) });
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.status).toBe("error");
    expect(json.message).toBe("Backend unreachable");
  });

  // ─── Query string forwarding ────────────────────────────────────

  it("forwards query params to upstream", async () => {
    fetchSpy = mockFetchSuccess();
    vi.stubGlobal("fetch", fetchSpy);

    const req = makeRequest("events?limit=25&offset=0");
    await GET(req, { params: Promise.resolve({ path: ["events"] }) });

    const [targetUrl] = fetchSpy.mock.calls[0];
    expect(targetUrl).toContain("limit=25");
    expect(targetUrl).toContain("offset=0");
  });

  // ─── Header forwarding ──────────────────────────────────────────

  it("forwards Authorization header to upstream", async () => {
    fetchSpy = mockFetchSuccess();
    vi.stubGlobal("fetch", fetchSpy);

    const req = makeRequest("events", {
      headers: { authorization: "Bearer test-token" },
    });
    await GET(req, { params: Promise.resolve({ path: ["events"] }) });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.get("authorization")).toBe("Bearer test-token");
  });

  // ─── auth-platform routes forward cookies (session management) ──

  it("forwards cookies for auth-platform routes (login, register)", async () => {
    fetchSpy = mockFetchSuccess();
    vi.stubGlobal("fetch", fetchSpy);

    const req = makeRequest("auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "session=abc123",
      },
      body: JSON.stringify({}),
    });

    await POST(req, { params: Promise.resolve({ path: ["auth", "login"] }) });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.get("cookie")).toBe("session=abc123");
  });

  // ─── cert-owned auth routes do NOT forward cookies ──────────────

  it("does not forward cookies for cert-owned auth routes (callback/refresh/logout)", async () => {
    fetchSpy = mockFetchSuccess();
    vi.stubGlobal("fetch", fetchSpy);

    const req = makeRequest("auth/refresh", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "loa_cert_refresh=xyz",
      },
      body: JSON.stringify({}),
    });

    await POST(req, { params: Promise.resolve({ path: ["auth", "refresh"] }) });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.get("cookie")).toBeNull();
  });

  // ─── Set-cookie forwarding ──────────────────────────────────────

  it("forwards set-cookie headers from upstream", async () => {
    const upstreamRes = new Response('{"ok":true}', {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": "loa_cert_refresh=abc; Path=/api/v1; HttpOnly",
      },
    });
    fetchSpy = vi.fn().mockResolvedValue(upstreamRes);
    vi.stubGlobal("fetch", fetchSpy);

    const req = makeRequest("auth/callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload: "test" }),
    });

    const res = await POST(req, {
      params: Promise.resolve({ path: ["auth", "callback"] }),
    });

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("loa_cert_refresh=abc");
  });

  // ─── Method passthrough ─────────────────────────────────────────

  it("passes PATCH method to upstream", async () => {
    fetchSpy = mockFetchSuccess();
    vi.stubGlobal("fetch", fetchSpy);

    const req = makeRequest("events/123", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    const { PATCH } = await import("@/app/api/v1/[...path]/route.ts");
    await PATCH(req, { params: Promise.resolve({ path: ["events", "123"] }) });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.method).toBe("PATCH");
  });
});
