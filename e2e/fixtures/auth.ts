import { test as base, type Page } from "@playwright/test";

const MOCK_AUTH_URL = "http://localhost:3001/api/v1/auth";

type Fixtures = {
  adminPage: Page;
  staffPage: Page;
  participantPage: Page;
};

async function authenticateAs(role: "admin" | "staff" | "participant", page: Page): Promise<string> {
  const email = `${role}@test.com`;
  const password = role; // Mock password matches role name

  const response = await page.request.post(`${MOCK_AUTH_URL}/tokens`, {
    data: { email, password },
  });

  if (!response.ok()) {
    console.error(`Failed to authenticate as ${role}:`, await response.text());
  }

  const data = await response.json();
  return data.data?.access_token || data.access_token;
}

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Authenticate via mock API
    await authenticateAs("admin", page);

    // Navigate to app - cookies will be set automatically
    await page.goto("/");

    await use(page);
    await context.close();
  },
  staffPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await authenticateAs("staff", page);
    await page.goto("/");

    await use(page);
    await context.close();
  },
  participantPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await authenticateAs("participant", page);
    await page.goto("/");

    await use(page);
    await context.close();
  },
});
