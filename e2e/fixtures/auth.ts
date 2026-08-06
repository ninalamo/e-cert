import { test as base, type Page } from "@playwright/test";

function createMockJWT(email: string, permissions: string[]): string {
  const payload = {
    sub: "test-user-uuid",
    email,
    name: "Test User",
    groups: ["loa-cert-test"],
    permissions,
    tenant: { id: "test-tenant", slug: "loa" },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    type: "access",
  };
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = Buffer.from("mock-signature").toString("base64url");
  return `${header}.${payloadBase64}.${signature}`;
}

type Fixtures = {
  adminPage: Page;
  staffPage: Page;
  participantPage: Page;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "loa_cert_refresh",
        value: "test-refresh-token",
        domain: "localhost",
        path: "/api/v1/auth",
      },
    ]);
    const page = await context.newPage();
    await page.goto("/");
    await page.evaluate((token) => {
      (window as any).__setAccessToken?.(token);
    }, createMockJWT("admin@test.com", ["admin:/api/v1/*"]));
    await use(page);
    await context.close();
  },
  staffPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    await page.evaluate((token) => {
      (window as any).__setAccessToken?.(token);
    }, createMockJWT("staff@test.com", ["write:/api/v1/events", "read:/api/v1/*"]));
    await use(page);
    await context.close();
  },
  participantPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    await page.evaluate((token) => {
      (window as any).__setAccessToken?.(token);
    }, createMockJWT("participant@test.com", ["read:/api/v1/me/certificates"]));
    await use(page);
    await context.close();
  },
});
