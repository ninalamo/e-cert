import { test as base, type Page } from "@playwright/test";

const MOCK_AUTH_URL = "http://localhost:3001/api/v1/auth";
const MOCK_SSO_URL = "http://localhost:3002/sso/login";

const testUsers: Record<string, any> = {
  "admin@test.com": {
    sub: "admin-uuid",
    email: "admin@test.com",
    name: "Admin User",
    groups: ["cert-admin"],
    permissions: ["admin:/api/v1/*", "read:/api/v1/events"],
    role: "admin",
  },
  "staff@test.com": {
    sub: "staff-uuid",
    email: "staff@test.com",
    name: "Staff User",
    groups: ["cert-staff"],
    permissions: ["write:/api/v1/events", "write:/api/v1/certificates", "read:/api/v1/*"],
    role: "staff",
  },
  "participant@test.com": {
    sub: "participant-uuid",
    email: "participant@test.com",
    name: "Participant User",
    groups: ["cert-user"],
    permissions: ["read:/api/v1/me/certificates"],
    role: "participant",
  },
};

async function directAuth(role: "admin" | "staff" | "participant", page: Page): Promise<string> {
  const email = `${role}@test.com`;
  const password = role;

  const response = await page.request.post(`${MOCK_AUTH_URL}/tokens`, {
    data: { email, password },
  });

  const data = await response.json();
  return data.data?.access_token || data.access_token;
}

async function ssoAuth(role: "admin" | "staff" | "participant", page: Page): Promise<void> {
  const email = `${role}@test.com`;
  const password = role;

  // Navigate to SSO login with credentials (auto-login mode)
  await page.goto(
    `${MOCK_SSO_URL}?redirect=http://localhost:3000&email=${email}&password=${password}`
  );

  // The SSO mock will redirect to the app with #payload=...
  // The app's SSO fragment handler will process it
}

type AuthFixtures = {
  adminPage: Page;
  staffPage: Page;
  participantPage: Page;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await directAuth("admin", page);
    await page.goto("/");
    await use(page);
    await context.close();
  },
  staffPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await directAuth("staff", page);
    await page.goto("/");
    await use(page);
    await context.close();
  },
  participantPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await directAuth("participant", page);
    await page.goto("/");
    await use(page);
    await context.close();
  },
});
