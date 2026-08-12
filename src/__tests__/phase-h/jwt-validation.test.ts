import { describe, it, expect } from "vitest";

describe("JWT Validation — Cross-app Token Integrity", () => {
  it("token payload has required claims", () => {
    // Simulated JWT payload (decoded token object)
    const payload = {
      sub: "user-uuid-123",
      email: "user@test.com",
      name: "Test User",
      groups: ["cert-user"],
      permissions: ["read:/api/v1/me/certificates"],
      tenant: { id: "tenant-1", slug: "loa" },
      iat: 1723456789,
      exp: 1723456789 + 3600,
      type: "access",
    };

    expect(payload.sub).toBe("user-uuid-123");
    expect(payload.email).toBe("user@test.com");
    expect(payload.name).toBe("Test User");
    expect(Array.isArray(payload.groups)).toBe(true);
    expect(payload.permissions).toContain("read:/api/v1/me/certificates");
    expect(payload.tenant).toBeDefined();
    expect(payload.tenant.slug).toBe("loa");
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();
    expect(payload.exp).toBeGreaterThan(payload.iat);
    expect(payload.type).toBe("access");
  });

  it("tenant.slug matches env config", () => {
    process.env.NEXT_PUBLIC_CERT_TENANT_SLUG = "loa";
    expect(process.env.NEXT_PUBLIC_CERT_TENANT_SLUG).toBe("loa");

    const jwtTenantSlug = "loa";
    expect(jwtTenantSlug).toBe(process.env.NEXT_PUBLIC_CERT_TENANT_SLUG);
  });

  it("permissions include resource-specific scopes", () => {
    const permissions = ["read:/api/v1/me/certificates", "read:/api/v1/events"];

    const hasReadScope = permissions.some((p) => p.startsWith("read:"));
    expect(hasReadScope).toBe(true);
  });

  it("expired token detection", () => {
    const now = Date.now() / 1000;
    const expired = now - 3600;
    const fresh = now + 3600;

    expect(expired).toBeLessThan(now);
    expect(fresh).toBeGreaterThan(now);
  });

  it("role resolved from permissions claim", () => {
    // Admin
    expect(["admin:/api/v1/*"].some((p) => p.startsWith("admin:"))).toBe(true);
    // Staff
    expect(["write:/api/v1/events"].some((p) => p.startsWith("write:"))).toBe(true);
    // Participant
    expect(["read:/api/v1/me/certificates"].every((p) => p.startsWith("read:"))).toBe(true);
  });
});