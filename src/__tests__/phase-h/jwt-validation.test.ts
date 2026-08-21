import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseAccessToken, type JwtPayload } from "@/lib/auth/jwt";
import { resolveRoleFromPermissions } from "@/lib/permissions";

function encodePayload(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.`;
}

function validPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: "user-uuid-123",
    email: "user@test.com",
    name: "Test User",
    groups: ["cert-user"],
    permissions: ["read:/api/v1/me/certificates"],
    tenant: { id: "tenant-1", slug: "loa" },
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + 3600,
    type: "access" as const,
    ...overrides,
  };
}

describe("JWT Validation — Cross-app Token Integrity", () => {
  const originalEnv = process.env.NEXT_PUBLIC_CERT_TENANT_SLUG;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CERT_TENANT_SLUG = "loa";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_CERT_TENANT_SLUG = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_CERT_TENANT_SLUG;
    }
  });

  describe("parseAccessToken", () => {
    it("parses a valid token", () => {
      const payload = validPayload();
      const token = encodePayload(payload);
      const result = parseAccessToken(token);
      expect(result).not.toBeNull();
      expect(result!.sub).toBe("user-uuid-123");
      expect(result!.email).toBe("user@test.com");
      expect(result!.name).toBe("Test User");
      expect(result!.groups).toEqual(["cert-user"]);
      expect(result!.permissions).toEqual(["read:/api/v1/me/certificates"]);
      expect(result!.tenant).toEqual({ id: "tenant-1", slug: "loa" });
      expect(result!.type).toBe("access");
    });

    it("rejects token with wrong type", () => {
      const payload = validPayload({ type: "refresh" });
      const token = encodePayload(payload);
      expect(parseAccessToken(token)).toBeNull();
    });

    it("rejects expired token", () => {
      const payload = validPayload({
        exp: Math.floor(Date.now() / 1000) - 3600,
      });
      const token = encodePayload(payload);
      expect(parseAccessToken(token)).toBeNull();
    });

    it("rejects token with wrong tenant slug", () => {
      const payload = validPayload({
        tenant: { id: "tenant-2", slug: "other" },
      });
      const token = encodePayload(payload);
      expect(parseAccessToken(token)).toBeNull();
    });

    it("rejects malformed token", () => {
      expect(parseAccessToken("not-a-jwt")).toBeNull();
      expect(parseAccessToken("")).toBeNull();
      expect(parseAccessToken("a.b")).toBeNull();
    });

    it("accepts token with missing optional fields", () => {
      const payload = validPayload({ name: null, groups: [] });
      const token = encodePayload(payload);
      const result = parseAccessToken(token);
      expect(result).not.toBeNull();
      expect(result!.name).toBeNull();
      expect(result!.groups).toEqual([]);
    });

    it("validates all required claims are present", () => {
      const payload = validPayload();
      const token = encodePayload(payload);
      const result = parseAccessToken(token);
      expect(result).not.toBeNull();
      expect(result!.sub).toBeDefined();
      expect(result!.email).toBeDefined();
      expect(result!.permissions).toBeDefined();
      expect(result!.tenant).toBeDefined();
      expect(result!.tenant.id).toBeDefined();
      expect(result!.tenant.slug).toBeDefined();
      expect(result!.iat).toBeDefined();
      expect(result!.exp).toBeDefined();
      expect(result!.type).toBeDefined();
    });

    it("token expiry is after issued-at", () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = validPayload({ iat: now - 100, exp: now + 3600 });
      const token = encodePayload(payload);
      const result = parseAccessToken(token);
      expect(result).not.toBeNull();
      expect(result!.exp).toBeGreaterThan(result!.iat);
    });
  });

  describe("resolveRoleFromPermissions", () => {
    it("resolves admin role from admin: scope", () => {
      expect(
        resolveRoleFromPermissions(["admin:/api/v1/*"])
      ).toBe("admin");
    });

    it("resolves staff role from write: scope", () => {
      expect(
        resolveRoleFromPermissions(["write:/api/v1/events"])
      ).toBe("staff");
    });

    it("resolves participant role from read: scope", () => {
      expect(
        resolveRoleFromPermissions(["read:/api/v1/me/certificates"])
      ).toBe("participant");
    });

    it("defaults to participant for empty permissions", () => {
      expect(resolveRoleFromPermissions([])).toBe("participant");
    });

    it("admin takes precedence over write and read", () => {
      const permissions = [
        "read:/api/v1/me/certificates",
        "write:/api/v1/events",
        "admin:/api/v1/*",
      ];
      expect(resolveRoleFromPermissions(permissions)).toBe("admin");
    });

    it("staff takes precedence over participant", () => {
      const permissions = [
        "read:/api/v1/me/certificates",
        "write:/api/v1/events",
      ];
      expect(resolveRoleFromPermissions(permissions)).toBe("staff");
    });

    it("handles wildcard permissions", () => {
      expect(
        resolveRoleFromPermissions(["admin:/api/v1/*"])
      ).toBe("admin");
      expect(
        resolveRoleFromPermissions(["write:/api/v1/*"])
      ).toBe("staff");
      expect(
        resolveRoleFromPermissions(["read:/api/v1/*"])
      ).toBe("participant");
    });
  });
});
